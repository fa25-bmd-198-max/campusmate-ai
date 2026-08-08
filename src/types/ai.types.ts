// ============================================================
// AI request / response shape definitions.
// Every structured Gemini response is typed here and validated
// at runtime with the matching Zod schema in ai.ts.
// ============================================================

// ── Chat ─────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'error'

export interface ChatMessage {
  id:        string          // local UUID — not persisted
  role:      ChatRole
  content:   string
  streaming?: boolean        // true while the chunk is still arriving
  timestamp: number          // Date.now()
}

// Context passed to the system prompt
export interface ChatContext {
  noteTitle?:   string        // if opened from a note detail page
  noteContent?: string        // truncated text for context
}

// ── Lecture Summarization ─────────────────────────────────────

export interface SummaryResult {
  summary:        string
  key_concepts:   string[]
  definitions:    Array<{ term: string; definition: string }>
  formulas:       string[]
  revision_notes: string
  exam_topics:    string[]
}

// ── Flashcard Generation ──────────────────────────────────────

export interface FlashcardItem {
  question: string
  answer:   string
  topic:    string   // always has a value — Zod defaults to 'General' if omitted
}

// ── Quiz Generation ───────────────────────────────────────────

export interface QuizItem {
  type:           'mcq' | 'true_false' | 'fill_blank' | 'short_answer'
  question:       string
  options:        string[] | null   // Zod defaults null when omitted
  correct_answer: string
  explanation:    string            // Zod defaults '' when omitted
}

// ── Study Plan Generation ─────────────────────────────────────

export interface StudyPlanSession {
  subject:      string
  topic:        string
  duration_min: number
  type:         'revision' | 'practice_test' | 'rest'
}

export interface StudyPlanDay {
  date:     string            // YYYY-MM-DD
  sessions: StudyPlanSession[]
}

// ── Partner Matching ──────────────────────────────────────────

export interface PartnerMatchResult {
  user_id:             string
  score:               number          // 0–100
  explanation:         string
  shared_courses:      string[]
  shared_availability: string[]
}

// ── Assignment Breakdown ──────────────────────────────────────

export interface AssignmentBreakdown {
  understanding:   string
  subtasks:        string[]
  research_directions: string[]
  key_concepts:    string[]
  timeline:        string
}

// ── AI hook state ─────────────────────────────────────────────

export interface AIState {
  loading:  boolean
  error:    string | null
}
