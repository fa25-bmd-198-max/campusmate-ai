// Re-export DB row types for convenience
export type {
  FlashcardSetRow,
  FlashcardRow,
  FlashcardSetInsert,
  FlashcardInsert,
} from './database.types'

// ── Generation options ────────────────────────────────────────
export interface GenerateFlashcardsOptions {
  noteId:    string          // source note
  noteTitle: string          // used as the set title
  count:     number          // 10–50
  subject:   string | null
}

// ── Review session state ──────────────────────────────────────
export type MasteryAction = 'mastered' | 'needs_review'

export interface ReviewSessionSummary {
  total:      number
  mastered:   number
  needsReview: number
}
