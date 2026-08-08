export type {
  StudyPlanRow,
  StudySessionRow,
  StudyPlanInsert,
  StudySessionInsert,
  SessionType,
} from './database.types'

// ── Planner input form ────────────────────────────────────────
export interface SubjectEntry {
  name:      string
  examDate:  string   // YYYY-MM-DD
}

export interface PlannerInput {
  subjects:     SubjectEntry[]
  availability: Record<string, boolean>  // mon→true, tue→false, …
  studyHours:   number                   // hours per available day
  weakTopics:   string
  goals:        string
}

// ── Plan with sessions (joined) ───────────────────────────────
export interface PlanDay {
  date:     string
  sessions: StudySessionForDisplay[]
}

export interface StudySessionForDisplay {
  id:           string
  subject:      string | null
  topic:        string | null
  session_type: 'revision' | 'practice_test' | 'rest' | null
  duration_min: number | null
  completed:    boolean
  scheduled_at: string | null
}
