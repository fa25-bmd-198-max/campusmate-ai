// ============================================================
// AI Service — powered by Groq (free, no billing required)
// Model: llama-3.3-70b-versatile (fast, high-quality, free tier)
//
// All exported function signatures are identical to the previous
// Gemini implementation — no other files need to change.
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

// ── Model to use ──────────────────────────────────────────────
// llama-3.3-70b-versatile: best quality on Groq free tier
// Fallback: llama3-8b-8192 (faster, smaller)
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ── Client initialization ─────────────────────────────────────

const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined

function getClient(): Groq {
  if (!apiKey) {
    throw new Error(
      'Groq API key is not configured. ' +
      'In Vercel: Settings → Environment Variables → add VITE_GROQ_API_KEY, then redeploy. ' +
      'Locally: add VITE_GROQ_API_KEY=gsk_... to your .env.local file.',
    )
  }
  // dangerouslyAllowBrowser: true is required for browser-side usage
  return new Groq({ apiKey, dangerouslyAllowBrowser: true })
}

// ── Error classification ──────────────────────────────────────

function isRateLimit(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.message.includes('429') ||
      err.message.toLowerCase().includes('rate limit') ||
      err.message.toLowerCase().includes('quota'))
  )
}

function isNetworkError(err: unknown): boolean {
  return err instanceof Error && err.message.toLowerCase().includes('fetch')
}

function classifyError(err: unknown): string {
  if (isRateLimit(err))
    return 'AI rate limit reached. Please wait 30 seconds and try again.'
  if (isNetworkError(err))
    return 'Connection error. Please check your internet and try again.'
  if (err instanceof Error) return err.message
  return 'An unexpected AI error occurred. Please try again.'
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ── JSON fence stripper ───────────────────────────────────────

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()
}

// ── generateText ──────────────────────────────────────────────
/**
 * Generates a free-text response using Groq.
 * Retries once on network failure (1 s delay).
 */
export async function generateText(prompt: string): Promise<string> {
  let lastErr: unknown

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await getClient().chat.completions.create({
        model:    GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  4096,
      })
      return completion.choices[0]?.message?.content ?? ''
    } catch (err) {
      lastErr = err
      if (isRateLimit(err)) throw new Error(classifyError(err))
      if (attempt === 0) await sleep(1000)
    }
  }
  throw new Error(classifyError(lastErr))
}

// ── streamText ────────────────────────────────────────────────
/**
 * Streams a text response token-by-token via Groq streaming.
 * Calls onChunk with each text fragment. Returns full text.
 */
export async function streamText(
  prompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured. Add VITE_GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')

  try {
    const stream = await getClient().chat.completions.create({
      model:    GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens:  4096,
      stream: true,
    })

    let full = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) {
        onChunk(text)
        full += text
      }
    }
    return full
  } catch (err) {
    throw new Error(classifyError(err))
  }
}

// ── generateStructuredOutput ──────────────────────────────────
/**
 * Generates a structured JSON response from Groq.
 * Validates with the provided Zod schema.
 */
export async function generateStructuredOutput<T>(
  prompt: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const fullPrompt =
    prompt +
    '\n\nIMPORTANT: Respond with valid JSON only. No markdown code fences. No extra explanation.'

  const text    = await generateText(fullPrompt)
  const cleaned = stripFences(text)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(
      `AI returned invalid JSON.\nFirst 500 chars of response:\n${cleaned.slice(0, 500)}`,
    )
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`AI response failed validation: ${issues}`)
  }

  return result.data
}

// ── Multi-turn chat ───────────────────────────────────────────

export interface ChatTurn {
  role:  'user' | 'model'
  parts: Array<{ text: string }>
}

// Converts our internal ChatTurn format to Groq's message format
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

/**
 * Sends a message in a multi-turn conversation context.
 */
export async function sendChatMessage(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured. Add VITE_GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')

  try {
    const completion = await getClient().chat.completions.create({
      model:       GROQ_MODEL,
      messages:    toGroqMessages(systemPrompt, history, userMessage),
      temperature: 0.7,
      max_tokens:  2048,
    })
    return completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    throw new Error(classifyError(err))
  }
}

/**
 * Streaming variant of sendChatMessage.
 * Calls onChunk with each text fragment. Returns full text.
 */
export async function streamChatMessage(
  systemPrompt: string,
  history: ChatTurn[],
  userMessage: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!apiKey) throw new Error('Groq API key is not configured. Add VITE_GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.')

  try {
    const stream = await getClient().chat.completions.create({
      model:       GROQ_MODEL,
      messages:    toGroqMessages(systemPrompt, history, userMessage),
      temperature: 0.7,
      max_tokens:  2048,
      stream:      true,
    })

    let full = ''
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) {
        onChunk(text)
        full += text
      }
    }
    return full
  } catch (err) {
    throw new Error(classifyError(err))
  }
}

// ── Zod schemas (unchanged — same shapes, just different AI backend) ──

export const SummarySchema = z.object({
  summary:        z.string().min(1),
  key_concepts:   z.array(z.string()),
  definitions:    z.array(z.object({ term: z.string(), definition: z.string() })),
  formulas:       z.array(z.string()),
  revision_notes: z.string(),
  exam_topics:    z.array(z.string()),
}) satisfies z.ZodType<SummaryResult>

export const FlashcardItemSchema = z.object({
  question: z.string().min(1),
  answer:   z.string().min(1),
  topic:    z.string().default('General'),
})

export const FlashcardsSchema: z.ZodType<FlashcardItem[]> = z.array(FlashcardItemSchema) as z.ZodType<FlashcardItem[]>

export const QuizItemSchema = z.object({
  type:           z.enum(['mcq', 'true_false', 'fill_blank', 'short_answer']),
  question:       z.string().min(1),
  options:        z.array(z.string()).nullable().default(null),
  correct_answer: z.string().min(1),
  explanation:    z.string().default(''),
})

export const QuizSchema: z.ZodType<QuizItem[]> = z.array(QuizItemSchema) as z.ZodType<QuizItem[]>

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

export const StudyPlanSchema = z.array(StudyPlanDaySchema) satisfies z.ZodType<StudyPlanDay[]>

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

// ── Prompt builders (unchanged) ───────────────────────────────

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
    const weakList   = profile.weak_subjects?.length ? profile.weak_subjects.join(', ') : 'none identified'

    let base = `You are CampusMate AI, an expert academic assistant for university students.
Student: ${profile.full_name ?? 'Student'}
University: ${profile.university ?? 'not specified'}
Degree: ${profile.degree ?? 'not specified'}
Semester: ${profile.semester ?? 'not specified'}
Enrolled courses: ${courseList}
Learning style: ${profile.learning_style ?? 'not specified'}
Weak subjects: ${weakList}

Answer academic questions clearly and concisely.
Format responses with markdown where helpful (headings, bullet points, code blocks).
Keep answers educational and focused. If asked something outside academics, gently redirect.
Offer follow-up suggestions to deepen understanding when appropriate.`

    if (noteContext) {
      base += `\n\nThe student is currently studying: "${noteContext.title}"
Relevant content from their notes:
${noteContext.content.slice(0, 2000)}

Prioritise answers that relate to this material when relevant.`
    }
    return base
  },

  summarise(extractedText: string): string {
    return `You are an academic study assistant. Analyse the following lecture content and respond with a JSON object matching this exact schema:
{
  "summary": "string (structured, 300-500 words)",
  "key_concepts": ["string"],
  "definitions": [{ "term": "string", "definition": "string" }],
  "formulas": ["string"],
  "revision_notes": "string (bullet points, each on a new line starting with •)",
  "exam_topics": ["string"]
}

Lecture content:
${extractedText.slice(0, 28000)}`
  },

  flashcards(text: string, count: number): string {
    return `Generate exactly ${count} flashcards from the following study material.
Each flashcard must cover a distinct concept, definition, or fact.
Respond with a JSON array — no other text:
[{ "question": "string", "answer": "string", "topic": "string" }]

Material:
${text.slice(0, 28000)}`
  },

  quiz(text: string, count: number, types: string[]): string {
    return `Generate exactly ${count} quiz questions from the following material.
Requested question types (use only these): ${types.join(', ')}.

Respond with a JSON array — no other text:
[{
  "type": "mcq|true_false|fill_blank|short_answer",
  "question": "string",
  "options": ["Option A","Option B","Option C","Option D"] or null,
  "correct_answer": "string",
  "explanation": "string (why this answer is correct)"
}]

For MCQ: provide exactly 4 options.
For true_false: provide null for options, answer is "True" or "False".
For fill_blank: use ___ in the question, answer is the missing word/phrase.
For short_answer: provide null for options.

Material:
${text.slice(0, 28000)}`
  },

  studyPlan(params: {
    subjectsWithDates: string
    weakTopics:        string
    availability:      string
    goals:             string
    startDate:         string
    endDate:           string
  }): string {
    return `Create a day-by-day study plan from ${params.startDate} to ${params.endDate}.

Student details:
- Subjects and exam dates: ${params.subjectsWithDates}
- Weak topics needing extra time: ${params.weakTopics}
- Daily availability: ${params.availability}
- Academic goals: ${params.goals}

Rules:
- Weak topics should get proportionally more sessions
- Include rest sessions (at least one per week)
- Practice test sessions should increase closer to exam dates
- Do not schedule sessions on days with no availability

Respond with a JSON array — no other text:
[{
  "date": "YYYY-MM-DD",
  "sessions": [{
    "subject": "string",
    "topic": "string",
    "duration_min": number,
    "type": "revision|practice_test|rest"
  }]
}]`
  },

  partnerMatch(currentProfile: string, candidates: string): string {
    return `Analyse study partner compatibility between the current student and each candidate.

Current student:
${currentProfile}

Candidates:
${candidates}

For each candidate, assess: shared courses, semester proximity, learning style compatibility, schedule overlap, complementary strengths/weaknesses.

Respond with a JSON array sorted by score descending — no other text:
[{
  "user_id": "string",
  "score": number (0-100),
  "explanation": "string (2-3 sentences explaining the match)",
  "shared_courses": ["string"],
  "shared_availability": ["string"]
}]`
  },

  assignmentBreakdown(title: string, description: string, deadline: string, course: string): string {
    return `You are an academic planning assistant. Help a student understand and plan their assignment.

Assignment: ${title}
Course: ${course}
Deadline: ${deadline}
Description:
${description}

Respond with a JSON object — no other text:
{
  "understanding": "string (clear restatement of what the assignment requires)",
  "subtasks": ["string (specific actionable task)"],
  "research_directions": ["string (specific research direction or resource type)"],
  "key_concepts": ["string (concept the student should understand)"],
  "timeline": "string (suggested day-by-day breakdown leading to deadline)"
}

Important: Do NOT generate any part of the submission itself. Focus only on planning and understanding.`
  },
}
