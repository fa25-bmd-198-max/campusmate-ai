export type {
  QuizRow,
  QuizQuestionRow,
  QuizAttemptRow,
  QuizInsert,
  QuizQuestionInsert,
  QuizAttemptInsert,
  QuestionType,
} from './database.types'

// ── Generation options ────────────────────────────────────────
export type QuizQuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer'

export interface GenerateQuizOptions {
  noteId:        string
  noteTitle:     string
  questionCount: number             // 5–30
  types:         QuizQuestionType[] // at least one selected
  subject:       string | null
}

// ── Attempt answer (local state before submit) ────────────────
export interface PendingAnswer {
  questionId: string
  answer:     string   // empty string = unanswered
}

// ── Scored result per question ────────────────────────────────
export interface ScoredAnswer {
  question_id:    string
  answer:         string
  correct:        boolean
  correct_answer: string
  explanation:    string
}

// ── Performance insight ───────────────────────────────────────
export interface PerformanceInsight {
  bestTopic:   string | null
  worstTopic:  string | null
  totalScore:  number
  totalCount:  number
  percentage:  number
}
