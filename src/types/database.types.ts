// ============================================================
// Supabase Database Type Definitions
// Mirrors the schema defined in supabase/migrations/
// Keep in sync manually until Supabase CLI codegen is set up.
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Enums / union types ──────────────────────────────────────

export type LearningStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic'
export type NoteStatus     = 'pending' | 'processing' | 'ready' | 'error'
export type NoteFileType   = 'pdf' | 'docx' | 'pptx' | 'txt'
export type SessionType    = 'revision' | 'practice_test' | 'rest'
export type EventType      = 'exam' | 'assignment' | 'study' | 'meeting' | 'reminder'
export type GroupRole      = 'admin' | 'member'
export type TeamRole       = 'lead' | 'member'
export type ConnectionStatus = 'pending' | 'accepted' | 'declined'
export type NotificationType =
  | 'study_reminder'
  | 'group_invite'
  | 'deadline'
  | 'exam_reminder'
  | 'ai_rec'
  | 'connection_request'
export type QuestionType   = 'mcq' | 'true_false' | 'fill_blank' | 'short_answer'
export type ReportStatus   = 'open' | 'resolved' | 'dismissed'
export type ContentType    = 'note' | 'group' | 'profile' | 'message'

// ── Row types (what the DB returns) ─────────────────────────

export interface ProfileRow {
  id:                  string
  full_name:           string
  avatar_url:          string | null
  university:          string | null
  department:          string | null
  degree:              string | null
  semester:            number | null
  bio:                 string | null
  learning_style:      LearningStyle | null
  study_hours_per_day: number | null
  weekly_availability: Record<string, number[]> | null
  academic_goals:      string[]
  skills:              string[]
  weak_subjects:       string[]
  interests:           string[]
  is_admin:            boolean
  privacy_public:      boolean
  show_in_matching:    boolean
  onboarding_complete: boolean
  notification_prefs:  Record<string, boolean>
  is_active:           boolean
  created_at:          string
  updated_at:          string
}

export interface CourseRow {
  id:         string
  user_id:    string
  name:       string
  code:       string | null
  instructor: string | null
  created_at: string
}

export interface NoteRow {
  id:             string
  user_id:        string
  title:          string
  subject:        string | null
  file_path:      string | null
  file_type:      NoteFileType | null
  file_size:      number | null
  status:         NoteStatus
  summary:        string | null
  key_concepts:   string[]
  definitions:    Array<{ term: string; definition: string }>
  formulas:       string[]
  revision_notes: string | null
  exam_topics:    string[]
  created_at:     string
}

export interface FlashcardSetRow {
  id:         string
  user_id:    string
  note_id:    string | null
  title:      string
  subject:    string | null
  card_count: number
  created_at: string
}

export interface FlashcardRow {
  id:         string
  set_id:     string
  user_id:    string
  question:   string
  answer:     string
  topic:      string | null
  mastered:   boolean
  created_at: string
}

export interface QuizRow {
  id:             string
  user_id:        string
  note_id:        string | null
  title:          string
  subject:        string | null
  question_count: number | null
  created_at:     string
}

export interface QuizQuestionRow {
  id:             string
  quiz_id:        string
  type:           QuestionType
  question:       string
  options:        string[] | null
  correct_answer: string
  explanation:    string | null
  sort_order:     number
}

export interface QuizAttemptRow {
  id:           string
  user_id:      string
  quiz_id:      string
  score:        number
  total:        number
  answers:      Array<{ question_id: string; answer: string; correct: boolean }>
  completed_at: string
}

export interface StudyGroupRow {
  id:          string
  name:        string
  description: string | null
  subject:     string | null
  is_private:  boolean
  max_members: number
  admin_id:    string | null
  created_at:  string
}

export interface GroupMemberRow {
  group_id:  string
  user_id:   string
  role:      GroupRole
  joined_at: string
}

export interface GroupMessageRow {
  id:         string
  group_id:   string
  user_id:    string
  content:    string
  created_at: string
}

export interface ProjectTeamRow {
  id:              string
  name:            string
  description:     string | null
  course:          string | null
  required_skills: string[]
  deadline:        string | null
  lead_id:         string | null
  created_at:      string
}

export interface TeamMemberRow {
  team_id:   string
  user_id:   string
  role:      TeamRole
  joined_at: string
}

export interface StudyPlanRow {
  id:         string
  user_id:    string
  title:      string
  config:     Json
  created_at: string
}

export interface StudySessionRow {
  id:           string
  user_id:      string
  plan_id:      string | null
  subject:      string | null
  topic:        string | null
  session_type: SessionType | null
  scheduled_at: string | null
  duration_min: number | null
  completed:    boolean
  created_at:   string
}

export interface CalendarEventRow {
  id:         string
  user_id:    string
  title:      string
  event_type: EventType
  starts_at:  string
  ends_at:    string | null
  notes:      string | null
  group_id:   string | null
  created_at: string
}

export interface ConnectionRow {
  id:          string
  sender_id:   string
  receiver_id: string
  status:      ConnectionStatus
  created_at:  string
}

export interface NotificationRow {
  id:         string
  user_id:    string
  type:       NotificationType
  title:      string
  message:    string | null
  link:       string | null
  read:       boolean
  created_at: string
}

export interface StudyLogRow {
  id:           string
  user_id:      string
  session_id:   string | null
  subject:      string | null
  duration_min: number
  logged_at:    string
}

export interface ReportRow {
  id:           string
  reporter_id:  string
  content_type: ContentType
  content_id:   string
  reason:       string
  status:       ReportStatus
  created_at:   string
}

// ── Insert types (what we send to the DB) ────────────────────

export type ProfileInsert = Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>
export type CourseInsert  = Omit<CourseRow, 'id' | 'created_at'>
export type NoteInsert    = Omit<NoteRow,  'id' | 'created_at'>

export type FlashcardSetInsert = Omit<FlashcardSetRow, 'id' | 'created_at' | 'card_count'>
export type FlashcardInsert    = Omit<FlashcardRow,    'id' | 'created_at'>

export type QuizInsert         = Omit<QuizRow,         'id' | 'created_at'>
export type QuizQuestionInsert = Omit<QuizQuestionRow, 'id'>
export type QuizAttemptInsert  = Omit<QuizAttemptRow,  'id' | 'completed_at'>

export type StudyGroupInsert  = Omit<StudyGroupRow,  'id' | 'created_at'>
export type GroupMemberInsert = Omit<GroupMemberRow, 'joined_at'>
export type GroupMessageInsert = Omit<GroupMessageRow, 'id' | 'created_at'>

export type ProjectTeamInsert = Omit<ProjectTeamRow, 'id' | 'created_at'>
export type TeamMemberInsert  = Omit<TeamMemberRow,  'joined_at'>

export type StudyPlanInsert    = Omit<StudyPlanRow,    'id' | 'created_at'>
export type StudySessionInsert = Omit<StudySessionRow, 'id' | 'created_at'>
export type CalendarEventInsert = Omit<CalendarEventRow, 'id' | 'created_at'>

export type ConnectionInsert  = Omit<ConnectionRow,  'id' | 'created_at'>
export type NotificationInsert = Omit<NotificationRow, 'id' | 'created_at'>

export type StudyLogInsert = Omit<StudyLogRow, 'id'>
export type ReportInsert   = Omit<ReportRow,   'id' | 'created_at' | 'status'>

// ── Database generic type (used to type the Supabase client) ─

export interface Database {
  public: {
    Tables: {
      profiles:       { Row: ProfileRow;       Insert: ProfileInsert;       Update: ProfileInsert }
      courses:        { Row: CourseRow;        Insert: CourseInsert;        Update: Partial<CourseInsert> }
      notes:          { Row: NoteRow;          Insert: NoteInsert;          Update: Partial<NoteInsert> }
      flashcard_sets: { Row: FlashcardSetRow;  Insert: FlashcardSetInsert;  Update: Partial<FlashcardSetInsert> }
      flashcards:     { Row: FlashcardRow;     Insert: FlashcardInsert;     Update: Partial<FlashcardInsert> }
      quizzes:        { Row: QuizRow;          Insert: QuizInsert;          Update: Partial<QuizInsert> }
      quiz_questions: { Row: QuizQuestionRow;  Insert: QuizQuestionInsert;  Update: Partial<QuizQuestionInsert> }
      quiz_attempts:  { Row: QuizAttemptRow;   Insert: QuizAttemptInsert;   Update: Partial<QuizAttemptInsert> }
      study_groups:   { Row: StudyGroupRow;    Insert: StudyGroupInsert;    Update: Partial<StudyGroupInsert> }
      group_members:  { Row: GroupMemberRow;   Insert: GroupMemberInsert;   Update: Partial<GroupMemberInsert> }
      group_messages: { Row: GroupMessageRow;  Insert: GroupMessageInsert;  Update: Partial<GroupMessageInsert> }
      project_teams:  { Row: ProjectTeamRow;   Insert: ProjectTeamInsert;   Update: Partial<ProjectTeamInsert> }
      team_members:   { Row: TeamMemberRow;    Insert: TeamMemberInsert;    Update: Partial<TeamMemberInsert> }
      study_plans:    { Row: StudyPlanRow;     Insert: StudyPlanInsert;     Update: Partial<StudyPlanInsert> }
      study_sessions: { Row: StudySessionRow;  Insert: StudySessionInsert;  Update: Partial<StudySessionInsert> }
      calendar_events:{ Row: CalendarEventRow; Insert: CalendarEventInsert; Update: Partial<CalendarEventInsert> }
      connections:    { Row: ConnectionRow;    Insert: ConnectionInsert;    Update: Partial<ConnectionInsert> }
      notifications:  { Row: NotificationRow;  Insert: NotificationInsert;  Update: Partial<NotificationInsert> }
      study_logs:     { Row: StudyLogRow;      Insert: StudyLogInsert;      Update: Partial<StudyLogInsert> }
      reports:        { Row: ReportRow;        Insert: ReportInsert;        Update: Partial<ReportInsert> }
    }
    Functions: {
      get_study_hours_summary: {
        Args: { p_user_id: string; p_days?: number }
        Returns: Array<{ logged_at: string; total_minutes: number }>
      }
      get_quiz_performance: {
        Args: { p_user_id: string }
        Returns: Array<{ subject: string; avg_score: number; attempt_count: number }>
      }
      create_notification: {
        Args: { p_user_id: string; p_type: string; p_title: string; p_message?: string; p_link?: string }
        Returns: string
      }
    }
  }
}
