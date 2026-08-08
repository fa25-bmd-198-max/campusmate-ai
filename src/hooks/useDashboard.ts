import { useQuery } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import { calculateStreak } from '@/utils/streakCalculator'
import type { CalendarEventRow, NoteRow, QuizAttemptRow, QuizRow, GroupMessageRow, StudyGroupRow } from '@/types/database.types'

// ── Query keys ────────────────────────────────────────────────
export const dashboardKeys = {
  upcomingEvents:  (uid: string) => ['dashboard', 'events',  uid] as const,
  recentNotes:     (uid: string) => ['dashboard', 'notes',   uid] as const,
  recentQuizzes:   (uid: string) => ['dashboard', 'quizzes', uid] as const,
  flashcardsDue:   (uid: string) => ['dashboard', 'flashcards', uid] as const,
  groupActivity:   (uid: string) => ['dashboard', 'groups',  uid] as const,
  studyStreak:     (uid: string) => ['dashboard', 'streak',  uid] as const,
  todayTasks:      (uid: string) => ['dashboard', 'tasks',   uid] as const,
}

// ── Upcoming exams (next 7 days) ─────────────────────────────
export interface UpcomingEvent extends CalendarEventRow {}

export function useUpcomingEvents() {
  const { user } = useAuthContext()
  const now  = new Date().toISOString()
  const week = new Date(Date.now() + 7 * 86_400_000).toISOString()

  return useQuery({
    queryKey: dashboardKeys.upcomingEvents(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .eq('event_type', 'exam')
        .gte('starts_at', now)
        .lte('starts_at', week)
        .order('starts_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as UpcomingEvent[]
    },
    enabled: !!user?.id,
  })
}

// ── Today's tasks (calendar events for today) ────────────────
export function useTodayTasks() {
  const { user } = useAuthContext()
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)

  return useQuery({
    queryKey: dashboardKeys.todayTasks(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user!.id)
        .gte('starts_at', todayStart.toISOString())
        .lte('starts_at', todayEnd.toISOString())
        .order('starts_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as CalendarEventRow[]
    },
    enabled: !!user?.id,
  })
}

// ── Recent notes (last 3 uploaded) ───────────────────────────
export function useRecentNotes() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: dashboardKeys.recentNotes(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, subject, file_type, status, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data ?? []) as Pick<NoteRow, 'id'|'title'|'subject'|'file_type'|'status'|'created_at'>[]
    },
    enabled: !!user?.id,
  })
}

// ── Recent quiz attempts (last 3) ────────────────────────────
export interface RecentQuiz extends QuizAttemptRow {
  quiz: Pick<QuizRow, 'title'|'subject'> | null
}

export function useRecentQuizzes() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: dashboardKeys.recentQuizzes(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*, quiz:quizzes(title, subject)')
        .eq('user_id', user!.id)
        .order('completed_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return (data ?? []) as RecentQuiz[]
    },
    enabled: !!user?.id,
  })
}

// ── Flashcards due (needs review count) ──────────────────────
export function useFlashcardsDue() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: dashboardKeys.flashcardsDue(user?.id ?? ''),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('mastered', false)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!user?.id,
  })
}

// ── Group activity (latest message per group) ────────────────
export interface GroupActivity {
  group: Pick<StudyGroupRow, 'id'|'name'|'subject'>
  lastMessage: Pick<GroupMessageRow, 'content'|'created_at'> | null
}

export function useGroupActivity() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: dashboardKeys.groupActivity(user?.id ?? ''),
    queryFn: async () => {
      // Get user's groups
      const { data: memberships, error: mErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user!.id)
        .limit(5)
      if (mErr) throw mErr
      if (!memberships?.length) return []

      const groupIds = memberships.map(m => m.group_id)

      const { data: groups, error: gErr } = await supabase
        .from('study_groups')
        .select('id, name, subject')
        .in('id', groupIds)
      if (gErr) throw gErr

      const results: GroupActivity[] = await Promise.all(
        (groups ?? []).map(async (group) => {
          const { data: msgs } = await supabase
            .from('group_messages')
            .select('content, created_at')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
          return {
            group: group as Pick<StudyGroupRow, 'id'|'name'|'subject'>,
            lastMessage: msgs?.[0] ?? null,
          }
        }),
      )
      return results
    },
    enabled: !!user?.id,
  })
}

// ── Study streak ─────────────────────────────────────────────
export function useStudyStreak() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: dashboardKeys.studyStreak(user?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_logs')
        .select('logged_at')
        .eq('user_id', user!.id)
        .order('logged_at', { ascending: true })
      if (error) throw error
      const dates = (data ?? []).map(r => r.logged_at as string)
      return calculateStreak(dates)
    },
    enabled: !!user?.id,
  })
}
