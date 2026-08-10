// ============================================================
// AI Service — powered by Groq (free, no billing required)
//
// Model cascade (tried in order):
//   1. llama-3.1-8b-instant   — fast, 6,000 TPM free tier
//   2. gemma2-9b-it            — 5,000 TPM, reliable fallback
//   3. llama-3.3-70b-versatile — 12,000 TPM, best quality
//
// We start structured/document tasks on the FAST model to preserve
// the large model's TPM budget for the chat assistant.
//
// TOKEN BUDGET (llama-3.1-8b-instant, 6,000 TPM free tier):
//   ~100 tokens  = prompt instructions ("Output ONLY this JSON...")
//   ~100 tokens  = JSON schema example in prompt
//   ~400 tokens  = extracted text (1,600 chars ÷ 4 chars/token)
//   ~600 tokens  = AI JSON response (generous ceiling)
//   ~200 tokens  = Groq model overhead / system tokens
//   ──────────────────────────────────────────────────────────
//   ~1,400 tokens total — safely under 6,000 TPM even for
//   consecutive uploads and worst-case non-ASCII content.
// ============================================================

import Groq from 'groq-sdk'
import { z } from 'zod'
import type {
  SummaryResult,
  FlashcardItem,
  QuizItem,
  StudyPlanDay,
  PartnerMatchResult,
  AssignmentBreakdown,
} from '@/types/ai.types'

// ── Models ────────────────────────────────────────────────────
const MODEL_FAST   = 'llama-3.1-8b-instant'     // 6,000 TPM  — structured tasks
const MODEL_MEDIUM = 'gemma2-9b-it'              // 5,000 TPM  — fallback
const MODEL_BEST   = 'llama-3.3-70b-versatile'  // 12,000 TPM — chat / complex tasks

// ── Hard content limit ────────────────────────────────────────
// ALL content sent to structured AI calls is capped here.
// This is the single source of truth — fileParser.ts also caps at its own
// MAX_CHARS but this second cap ensures nothing slips through regardless
// of how the prompt is constructed.
//
// Raised to 3,000 chars (~750 tokens) since we now allow 1,200 tokens for the
// response. Total budget stays well under the 6,000 TPM free tier:
//   ~200 tokens  prompt instructions + JSON template
//   ~750 tokens  lecture content (3,000 chars ÷ 4)
//   ~1,200 tokens AI JSON response
//   ~200 tokens  model overhead
//   ──────────────────────────────────────────────
//   ~2,350 tokens total — safely under 6,000 TPM
const STRUCTURED_CONTENT_LIMIT = 3_000   // chars → ~750 tokens

// ── Client ────────────────────────────────────────────────────
const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined

function getClient(): Groq {
  if (!apiKey) {
    throw new Error(
      'Groq API key is not configured. ' +
      'In Vercel: Settings → Environment Variables → add VITE_GROQ_API_KEY, then redeploy. ' +
      'Locally: add VITE_GROQ_API_KEY=gsk_... to your .env.local file.',
    )
  }
  return new Groq({ apiKey, dangerouslyAllowBrowser: true })
}

// ── Error helpers ─────────────────────────────────────────────

/** True when Groq says the request body is too large for this model's context */
function isRequestTooLarge(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message
  return m.includes('413') || m.includes('Request too large') || m.includes('too large')
}

/** True when Groq says a model has been decommissioned */
function isDecommissioned(err: unknown): boolean {
  return err instanceof Error && err.message.includes('decommissioned')
}

/** True when Groq returns a TPM / RPM rate-limit response */
function isTPMRateLimit(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message
  return (
    m.includes('TPM') ||
    m.includes('rate_limit') ||
    (m.includes('429') && m.includes('token'))
  )
}

/** True for any error where the solution is "use a different model" */
function shouldSwitchModel(err: unknown): boolean {
  return isRequestTooLarge(err) || isDecommissioned(err)
}

function classifyError(err: unknown): string {
  if (err instanceof Error) {
    if (isTPMRateLimit(err))
      return 'AI is temporarily busy. Please wait a moment and try again.'
    if (isRequestTooLarge(err))
      return 'File content is too large for AI processing. Try a shorter file.'
    if (err.message.toLowerCase().includes('fetch'))
      return 'Connection error. Please check your internet and try again.'
    return err.message
  }
  return 'An unexpected AI error occurred. Please try again.'
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ── Robust JSON extractor + repairer ─────────────────────────
/**
 * Extracts and repairs the first complete JSON object `{...}` or array `[...]`
 * from a raw LLM response.
 *
 * Handles:
 * - Markdown code fences (```json ... ```)
 * - Conversational prefix/suffix text
 * - Truncated/incomplete JSON (closes unclosed braces/brackets)
 * - Trailing commas before closing delimiters
 */
function extractJSON(raw: string): string {
  // 1. Strip markdown fences
  let text = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // 2. Find the first opening brace/bracket
  const objStart = text.indexOf('{')
  const arrStart = text.indexOf('[')

  if (objStart === -1 && arrStart === -1) return text

  let startChar: '{' | '[', endChar: '}' | ']', startIdx: number
  if      (objStart === -1)              { startChar = '['; endChar = ']'; startIdx = arrStart }
  else if (arrStart === -1)              { startChar = '{'; endChar = '}'; startIdx = objStart }
  else if (objStart < arrStart)          { startChar = '{'; endChar = '}'; startIdx = objStart }
  else                                   { startChar = '['; endChar = ']'; startIdx = arrStart }

  // 3. Walk forward counting depth, respecting quoted strings
  let depth = 0, endIdx = -1, inString = false, escape = false

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (escape)               { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"')           { inString = !inString; continue }
    if (inString)             { continue }
    if (ch === startChar)     { depth++ }
    else if (ch === endChar)  { depth--; if (depth === 0) { endIdx = i; break } }
  }

  if (endIdx !== -1) {
    // Complete JSON found — return it directly
    return text.slice(startIdx, endIdx + 1).trim()
  }

  // 4. Truncated JSON — attempt repair by closing all open structures
  let fragment = text.slice(startIdx)

  // Remove any trailing partial string (unclosed quote)
  const lastQuote  = fragment.lastIndexOf('"')
  const secondLast = fragment.lastIndexOf('"', lastQuote - 1)
  if (lastQuote !== -1 && secondLast !== -1) {
    const between = fragment.slice(secondLast + 1, lastQuote)
    // If the content between the last two quotes looks like a key, the value is cut off
    if (!between.includes(':') && fragment.indexOf(':', lastQuote) === -1) {
      fragment = fragment.slice(0, secondLast + 1)
    }
  }

  // Remove trailing commas before we close
  fragment = fragment.replace(/,\s*$/, '')

  // Count open braces/brackets and close them
  let openBraces = 0, openBrackets = 0
  inString = false; escape = false
  for (const ch of fragment) {
    if (escape)               { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"')           { inString = !inString; continue }
    if (inString)             { continue }
    if      (ch === '{')      { openBraces++ }
    else if (ch === '}')      { openBraces-- }
    else if (ch === '[')      { openBrackets++ }
    else if (ch === ']')      { openBrackets-- }
  }

  // Close all open arrays first, then objects (LIFO order)
  let closing = ''
  for (let i = 0; i < Math.max(0, openBrackets); i++) closing += ']'
  for (let i = 0; i < Math.max(0, openBraces);   i++) closing += '}'

  return (fragment + closing).trim()
}

// ── Core text generation with model cascade ───────────────────
/**
 * Calls Groq with the given prompt and model cascade.
 * - Decommissioned model or request too large → immediately try next model.
 * - TPM rate-limit → wait 15 seconds, retry once, then try next model.
 * - Network errors → retry once after 1 second.
 */
async function callWithCascade(
  prompt:    string,
  cascade:   string[],
  maxTokens: number,
): Promise<string> {
  let lastErr: unknown

  for (let mi = 0; mi < cascade.length; mi++) {
    const model = cascade[mi]

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await getClient().chat.completions.create({
          model,
          messages:    [{ role: 'user', content: prompt }],
          temperature: 0.3,   // very deterministic for JSON
          max_tokens:  maxTokens,
        })
        return res.choices[0]?.message?.content ?? ''
      } catch (err) {
        lastErr = err

        if (shouldSwitchModel(err)) break   // immediately try next model

        if (isTPMRateLimit(err)) {
          if (attempt === 0) {
            // Wait 15 s for Groq's per-minute counter to reset, then retry same model
            await sleep(15_000)
            continue
          }
          break   // still limited → try next model
        }

        // Network / unknown — short wait, retry once
        if (attempt === 0) { await sleep(1_000); continue }
        break
      }
    }
  }

  throw new Error(classifyError(lastErr))
}

// ── generateText ──────────────────────────────────────────────
export async function generateText(prompt: string): Promise<string> {
  return callWithCascade(prompt, [MODEL_BEST, MODEL_MEDIUM, MODEL_FAST], 2048)
}

// ── streamText ────────────────────────────────────────────────
export async function streamText(
  prompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured. Add VITE_GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')

  let lastErr: unknown
  const cascade = [MODEL_BEST, MODEL_MEDIUM, MODEL_FAST]

  for (const model of cascade) {
    try {
      const stream = await getClient().chat.completions.create({
        model,
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  2048,
        stream:      true,
      })
      let full = ''
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) { onChunk(text); full += text }
      }
      return full
    } catch (err) {
      lastErr = err
      if (shouldSwitchModel(err) || isTPMRateLimit(err)) {
        await sleep(isTPMRateLimit(err) ? 15_000 : 300)
        continue
      }
      throw new Error(classifyError(err))
    }
  }
  throw new Error(classifyError(lastErr))
}

// ── generateStructuredOutput ──────────────────────────────────
/**
 * Structured JSON output for document-processing tasks.
 *
 * Pipeline:
 * 1. Caller builds a prompt with Prompts.summarise() etc. — already capped.
 * 2. This function caps content AGAIN at STRUCTURED_CONTENT_LIMIT (1,600 chars).
 * 3. Appends a minimal JSON-only instruction.
 * 4. Calls Groq with max_tokens=700 (sufficient for any summary JSON).
 * 5. extractJSON() strips markdown, finds the JSON, and repairs truncated output.
 * 6. Falls back to raw string parse, then throws a clean user-facing error.
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const instruction = '\n\nJSON only. No markdown. No explanation. No extra text. Start your response with { or [.'

  // Absolute content cap — safety net for any code path that bypasses prompt helpers.
  const safePrompt = prompt.length > STRUCTURED_CONTENT_LIMIT
    ? prompt.slice(0, STRUCTURED_CONTENT_LIMIT) + instruction
    : prompt + instruction

  // Use more tokens for array outputs (quiz/flashcards need ~80-120 tokens per item).
  // Detect by checking if the prompt asks for an array (starts with '[').
  // Summary prompts start with '{', array prompts start with '['.
  const expectsArray = safePrompt.trimStart().includes('Output ONLY a JSON array') ||
                       safePrompt.trimStart().includes('Output ONLY valid JSON:\n[')
  const maxTokens = expectsArray ? 2500 : 1200

  // Structured tasks: FAST → MEDIUM → BEST
  const raw = await callWithCascade(
    safePrompt,
    [MODEL_FAST, MODEL_MEDIUM, MODEL_BEST],
    maxTokens,
  )

  // Try to parse cleaned JSON, then fall back to raw
  const cleaned = extractJSON(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    try {
      parsed = JSON.parse(raw.trim())
    } catch {
      throw new Error('AI returned an unexpected response. Please try uploading again.')
    }
  }

  // First attempt: strict parse
  const result = schema.safeParse(parsed)
  if (result.success) return result.data

  // Second attempt: object coercion — merge with safe defaults.
  // Handles truncated summary responses where some fields are missing.
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const coerced: Record<string, unknown> = {
      summary:        '',
      key_concepts:   [],
      definitions:    [],
      formulas:       [],
      revision_notes: '',
      exam_topics:    [],
      ...(parsed as Record<string, unknown>),
    }
    for (const key of ['key_concepts', 'definitions', 'formulas', 'exam_topics']) {
      if (!Array.isArray(coerced[key])) coerced[key] = []
    }
    for (const key of ['summary', 'revision_notes']) {
      if (typeof coerced[key] !== 'string') coerced[key] = ''
    }
    const coercedResult = schema.safeParse(coerced)
    if (coercedResult.success) return coercedResult.data
  }

  // Third attempt: array coercion — filter out any items that fail per-item validation.
  // This handles quiz/flashcard responses where the AI produces mostly good items
  // but one or two items have a minor schema violation.
  if (Array.isArray(parsed) && parsed.length > 0) {
    // Try the full array first (already tried above but with a fresh .catch-equipped schema)
    const arrayResult = schema.safeParse(parsed)
    if (arrayResult.success) return arrayResult.data

    // Filter: keep only items that parse cleanly as individual objects.
    // Wrap in an array schema that uses .catch([]) so bad items are dropped.
    const filtered = parsed.filter((item) => {
      if (item === null || typeof item !== 'object') return false
      // Accept if the item has at minimum a non-empty question/answer string field
      const obj = item as Record<string, unknown>
      return (
        (typeof obj['question'] === 'string' && obj['question'].length > 0) ||
        (typeof obj['answer']   === 'string' && obj['answer'].length   > 0)
      )
    })
    if (filtered.length > 0) {
      const filteredResult = schema.safeParse(filtered)
      if (filteredResult.success) return filteredResult.data
    }
  }

  throw new Error('AI returned an unexpected response. Please try uploading again.')
}

// ── Multi-turn chat ───────────────────────────────────────────

export interface ChatTurn {
  role:  'user' | 'model'
  parts: Array<{ text: string }>
}

function toGroqMessages(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): Groq.Chat.ChatCompletionMessageParam[] {
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]
  for (const turn of history) {
    messages.push({
      role:    turn.role === 'user' ? 'user' : 'assistant',
      content: turn.parts.map((p) => p.text).join(''),
    })
  }
  messages.push({ role: 'user', content: userMessage })
  return messages
}

export async function sendChatMessage(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured. Add VITE_GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')
  try {
    const completion = await getClient().chat.completions.create({
      model:       MODEL_BEST,
      messages:    toGroqMessages(systemPrompt, history, userMessage),
      temperature: 0.7,
      max_tokens:  2048,
    })
    return completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw new Error(classifyError(err))
  }
}

export async function streamChatMessage(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured. Add VITE_GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')

  let lastErr: unknown
  const cascade = [MODEL_BEST, MODEL_MEDIUM, MODEL_FAST]

  for (const model of cascade) {
    try {
      const stream = await getClient().chat.completions.create({
        model,
        messages:    toGroqMessages(systemPrompt, history, userMessage),
        temperature: 0.7,
        max_tokens:  2048,
        stream:      true,
      })
      let full = ''
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? ''
        if (text) { onChunk(text); full += text }
      }
      return full
    } catch (err) {
      lastErr = err
      if (shouldSwitchModel(err) || isTPMRateLimit(err)) {
        await sleep(isTPMRateLimit(err) ? 15_000 : 300)
        continue
      }
      throw new Error(classifyError(err))
    }
  }
  throw new Error(classifyError(lastErr))
}

// ── Zod schemas ───────────────────────────────────────────────

export const SummarySchema = z.object({
  // .catch() supplies a fallback only when the field is missing or invalid
  // at parse time. The output type is always the non-optional base type.
  summary:        z.string().catch(''),
  key_concepts:   z.array(z.string()).catch([]),
  definitions:    z.array(
    z.object({
      term:       z.string().catch(''),
      definition: z.string().catch(''),
    }),
  ).catch([]),
  formulas:       z.array(z.string()).catch([]),
  revision_notes: z.string().catch(''),
  exam_topics:    z.array(z.string()).catch([]),
}) as z.ZodType<SummaryResult>

export const FlashcardItemSchema = z.object({
  question: z.string().min(1).catch(''),
  answer:   z.string().min(1).catch(''),
  topic:    z.string().catch('General'),
})

export const FlashcardsSchema: z.ZodType<FlashcardItem[]> =
  z.array(FlashcardItemSchema) as z.ZodType<FlashcardItem[]>

export const QuizItemSchema = z.object({
  type:           z.enum(['mcq', 'true_false', 'fill_blank', 'short_answer']).catch('mcq' as const),
  question:       z.string().min(1).catch(''),
  // Accept null, undefined, OR empty array — normalise all to null for non-MCQ types.
  // Some models return [] instead of null; treat those as null.
  options:        z.preprocess(
    (v) => (Array.isArray(v) && v.length === 0 ? null : v),
    z.array(z.string()).nullable().catch(null),
  ),
  correct_answer: z.string().catch(''),
  explanation:    z.string().catch(''),
})

export const QuizSchema: z.ZodType<QuizItem[]> =
  z.array(QuizItemSchema) as z.ZodType<QuizItem[]>

export const StudyPlanSessionSchema = z.object({
  subject:      z.string(),
  topic:        z.string(),
  duration_min: z.number().int().min(5).max(240),
  type:         z.enum(['revision', 'practice_test', 'rest']),
})

export const StudyPlanDaySchema = z.object({
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessions: z.array(StudyPlanSessionSchema),
})

export const StudyPlanSchema =
  z.array(StudyPlanDaySchema) satisfies z.ZodType<StudyPlanDay[]>

export const PartnerMatchSchema = z.array(
  z.object({
    user_id:             z.string(),
    score:               z.number().min(0).max(100),
    explanation:         z.string(),
    shared_courses:      z.array(z.string()),
    shared_availability: z.array(z.string()),
  }),
) satisfies z.ZodType<PartnerMatchResult[]>

export const AssignmentBreakdownSchema = z.object({
  understanding:       z.string(),
  subtasks:            z.array(z.string()),
  research_directions: z.array(z.string()),
  key_concepts:        z.array(z.string()),
  timeline:            z.string(),
}) satisfies z.ZodType<AssignmentBreakdown>

// ── Prompt builders ───────────────────────────────────────────

export const Prompts = {

  academicAssistant(profile: {
    full_name:       string | null
    degree?:         string | null
    university?:     string | null
    semester?:       number | null
    courses:         string[]
    learning_style?: string | null
    weak_subjects?:  string[]
  }, noteContext?: { title: string; content: string }): string {
    const courseList = profile.courses.length ? profile.courses.join(', ') : 'not specified'
    const weakList   = profile.weak_subjects?.length ? profile.weak_subjects.join(', ') : 'none'

    let base =
      `You are CampusMate AI, an expert academic assistant.\n` +
      `Student: ${profile.full_name ?? 'Student'} | ` +
      `Degree: ${profile.degree ?? 'not specified'} | ` +
      `University: ${profile.university ?? 'not specified'} | ` +
      `Semester: ${profile.semester ?? '?'}\n` +
      `Courses: ${courseList}\n` +
      `Weak subjects: ${weakList}\n\n` +
      `Answer clearly and concisely. Use markdown for structure. Stay educational.`

    if (noteContext) {
      base +=
        `\n\nCurrently studying: "${noteContext.title}"\n` +
        `Notes excerpt:\n${noteContext.content.slice(0, 1_200)}`
    }
    return base
  },

  summarise(extractedText: string): string {
    // Cap at STRUCTURED_CONTENT_LIMIT minus ~200 chars for the prompt template.
    // generateStructuredOutput will cap the full prompt again as a safety net.
    const text = extractedText.slice(0, STRUCTURED_CONTENT_LIMIT - 200)
    return (
      `Summarise this lecture. Output ONLY valid JSON:\n` +
      `{"summary":"2-3 sentences","key_concepts":["c1"],"definitions":[{"term":"t","definition":"d"}],"formulas":[],"revision_notes":"• point","exam_topics":["t1"]}\n\n` +
      `Lecture:\n${text}`
    )
  },

  flashcards(text: string, count: number): string {
    return (
      `Create ${count} flashcards. Output ONLY a JSON array:\n` +
      `[{"question":"q","answer":"a","topic":"t"}]\n\n` +
      `Content:\n${text.slice(0, STRUCTURED_CONTENT_LIMIT - 150)}`
    )
  },

  quiz(text: string, count: number, types: string[]): string {
    // Quiz prompts need more content space than summaries — cap higher.
    const content = text.slice(0, STRUCTURED_CONTENT_LIMIT - 300)
    const typeMap: Record<string, string> = {
      mcq:          'mcq (4 options array)',
      true_false:   'true_false (options must be null)',
      fill_blank:   'fill_blank (options must be null, use ___ in question)',
      short_answer: 'short_answer (options must be null)',
    }
    const typeDesc = types.map((t) => typeMap[t] ?? t).join(', ')
    return (
      `Create exactly ${count} quiz questions. Types to use: ${typeDesc}.\n` +
      `Output ONLY a JSON array, no other text:\n` +
      `[{"type":"mcq","question":"What is X?","options":["A","B","C","D"],"correct_answer":"A","explanation":"Because..."},` +
      `{"type":"true_false","question":"X is true.","options":null,"correct_answer":"True","explanation":"Because..."}]\n\n` +
      `Rules:\n` +
      `- mcq: options array with exactly 4 strings, correct_answer is one of the options\n` +
      `- true_false: options must be null, correct_answer is "True" or "False"\n` +
      `- fill_blank: options must be null, use ___ in question\n` +
      `- short_answer: options must be null\n\n` +
      `Content:\n${content}`
    )
  },

  studyPlan(params: {
    subjectsWithDates: string
    weakTopics:        string
    availability:      string
    goals:             string
    startDate:         string
    endDate:           string
  }): string {
    return (
      `Create a study plan from ${params.startDate} to ${params.endDate}.\n` +
      `Subjects: ${params.subjectsWithDates}\n` +
      `Weak topics: ${params.weakTopics}\n` +
      `Availability: ${params.availability}\n` +
      `Goals: ${params.goals}\n\n` +
      `Output ONLY a JSON array:\n` +
      `[{"date":"YYYY-MM-DD","sessions":[{"subject":"s","topic":"t","duration_min":60,"type":"revision"}]}]\n` +
      `Types: revision | practice_test | rest. Include at least one rest per week.`
    )
  },

  partnerMatch(currentProfile: string, candidates: string): string {
    return (
      `Score study partner compatibility. Output ONLY a JSON array sorted by score desc:\n` +
      `[{"user_id":"id","score":85,"explanation":"2 sentences","shared_courses":["c"],"shared_availability":["Mon evenings"]}]\n\n` +
      `Current student: ${currentProfile}\n\nCandidates:\n${candidates}`
    )
  },

  assignmentBreakdown(title: string, description: string, deadline: string, course: string): string {
    return (
      `Help plan this assignment. Output ONLY this JSON:\n` +
      `{"understanding":"restate requirements","subtasks":["task1"],"research_directions":["dir1"],"key_concepts":["concept1"],"timeline":"day-by-day plan"}\n\n` +
      `Assignment: ${title}\nCourse: ${course}\nDeadline: ${deadline}\nDescription: ${description.slice(0, 600)}`
    )
  },
}
