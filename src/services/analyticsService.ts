import { supabase } from './supabase'
import { calculateStreak } from '@/utils/streakCalculator'
import type { StreakResult } from '@/utils/streakCalculator'

// ── Types ─────────────────────────────────────────────────────

export interface DailyStudyHours {
  date:          string    // YYYY-MM-DD
  total_minutes: number
}

export interface QuizPerformanceEntry {
  subject:       string
  avg_score:     number    // 0-100
  attempt_count: number
}

export interface SubjectProgress {
  subject:            string
  study_hours:        number   // total hours from study_logs
  quiz_avg:           number   // 0-100
  flashcards_mastered: number
  flashcards_total:   number
  confidence:         'Strong' | 'Developing' | 'Needs Focus'
}

// ── Study hours summary ───────────────────────────────────────

/** Returns daily study minutes for the last `days` days (default 30) */
export async function getStudyHoursSummary(
  userId: string,
  days   = 30,
): Promise<DailyStudyHours[]> {
  // Use the stored function if available, else aggregate client-side
  const { data, error } = await supabase.rpc('get_study_hours_summary', {
    p_user_id: userId,
    p_days:    days,
  })

  if (error) {
    // Fallback: direct aggregation
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (days - 1))
    const { data: raw, error: e2 } = await supabase
      .from('study_logs')
      .select('logged_at, duration_min')
      .eq('user_id', userId)
      .gte('logged_at', cutoff.toISOString().slice(0, 10))
      .order('logged_at', { ascending: true })
    if (e2) throw e2

    // Aggregate by date client-side
    const map: Record<string, number> = {}
    ;(raw ?? []).forEach((r) => {
      const d = r.logged_at as string
      map[d]  = (map[d] ?? 0) + (r.duration_min as number)
    })
    return Object.entries(map).map(([date, total_minutes]) => ({ date, total_minutes }))
  }

  return (data ?? []) as DailyStudyHours[]
}

// ── Quiz performance ──────────────────────────────────────────

export async function getQuizPerformance(userId: string): Promise<QuizPerformanceEntry[]> {
  const { data, error } = await supabase.rpc('get_quiz_performance', { p_user_id: userId })

  if (error) {
    // Fallback: join quiz_attempts + quizzes client-side
    const { data: raw, error: e2 } = await supabase
      .from('quiz_attempts')
      .select('score, total, quiz:quizzes(subject)')
      .eq('user_id', userId)
    if (e2) throw e2

    const subjectMap: Record<string, { totalScore: number; totalQ: number; count: number }> = {}
    ;(raw ?? []).forEach((a) => {
      const quizRel = a.quiz
      const subjectStr: string =
        Array.isArray(quizRel)
          ? ((quizRel[0] as { subject: string | null } | undefined)?.subject ?? 'General')
          : ((quizRel as { subject: string | null } | null)?.subject ?? 'General')
      if (!subjectMap[subjectStr]) subjectMap[subjectStr] = { totalScore: 0, totalQ: 0, count: 0 }
      subjectMap[subjectStr].totalScore += (a.score as number)
      subjectMap[subjectStr].totalQ    += (a.total as number)
      subjectMap[subjectStr].count++
    })
    return Object.entries(subjectMap).map(([subject, v]) => ({
      subject,
      avg_score:     v.totalQ > 0 ? Math.round((v.totalScore / v.totalQ) * 100) : 0,
      attempt_count: v.count,
    })).sort((a, b) => b.avg_score - a.avg_score)
  }

  return (data ?? []) as QuizPerformanceEntry[]
}

// ── Subject progress ──────────────────────────────────────────

export async function getSubjectProgress(userId: string): Promise<SubjectProgress[]> {
  // 1. Study hours per subject
  const { data: logs } = await supabase
    .from('study_logs')
    .select('subject, duration_min')
    .eq('user_id', userId)

  const hoursMap: Record<string, number> = {}
  ;(logs ?? []).forEach((l) => {
    const s = l.subject ?? 'General'
    hoursMap[s] = (hoursMap[s] ?? 0) + ((l.duration_min as number) ?? 0)
  })

  // 2. Quiz avg per subject (reuse performance fn logic)
  const quizPerf = await getQuizPerformance(userId)
  const quizMap  = Object.fromEntries(quizPerf.map((q) => [q.subject, q.avg_score]))

  // 3. Flashcard mastery per subject
  const { data: fsets } = await supabase
    .from('flashcard_sets')
    .select('id, subject, card_count')
    .eq('user_id', userId)

  const setIds = (fsets ?? []).map((f) => f.id as string)
  let masteredMap: Record<string, number> = {}
  let totalMap:    Record<string, number> = {}

  if (setIds.length > 0) {
    const { data: cards } = await supabase
      .from('flashcards')
      .select('set_id, mastered')
      .in('set_id', setIds)

    ;(fsets ?? []).forEach((fs) => {
      const subj  = (fs.subject as string | null) ?? 'General'
      const total = (fs.card_count as number) ?? 0
      const done  = (cards ?? []).filter((c) => c.set_id === fs.id && c.mastered).length
      totalMap[subj]    = (totalMap[subj]    ?? 0) + total
      masteredMap[subj] = (masteredMap[subj] ?? 0) + done
    })
  }

  // 4. Merge all subjects
  const allSubjects = new Set([
    ...Object.keys(hoursMap),
    ...quizPerf.map((q) => q.subject),
    ...Object.keys(masteredMap),
  ])

  return Array.from(allSubjects).map((subject) => {
    const studyHours = Math.round((hoursMap[subject] ?? 0) / 60 * 10) / 10
    const quizAvg    = quizMap[subject] ?? 0
    const mastered   = masteredMap[subject] ?? 0
    const total      = totalMap[subject]    ?? 0

    // Confidence heuristic
    const score = (quizAvg * 0.5) + (studyHours > 0 ? 30 : 0) + (total > 0 ? (mastered / total) * 20 : 0)
    const confidence: SubjectProgress['confidence'] =
      score >= 70 ? 'Strong' : score >= 40 ? 'Developing' : 'Needs Focus'

    return { subject, study_hours: studyHours, quiz_avg: quizAvg, flashcards_mastered: mastered, flashcards_total: total, confidence }
  }).sort((a, b) => b.quiz_avg - a.quiz_avg)
}

// ── Study streak ──────────────────────────────────────────────

export async function getStudyStreak(userId: string): Promise<StreakResult> {
  const { data, error } = await supabase
    .from('study_logs')
    .select('logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true })
  if (error) throw error
  const dates = (data ?? []).map((r) => r.logged_at as string)
  return calculateStreak(dates)
}

// ── Heatmap data (last 12 weeks = 84 days) ───────────────────

export interface HeatmapDay {
  date:    string   // YYYY-MM-DD
  minutes: number
  week:    number   // 0-11 (column)
  day:     number   // 0-6 Sun-Sat (row)
}

export async function getHeatmapData(userId: string): Promise<HeatmapDay[]> {
  const summary = await getStudyHoursSummary(userId, 84)
  const minuteMap: Record<string, number> = {}
  summary.forEach((d) => { minuteMap[d.date] = d.total_minutes })

  const result: HeatmapDay[] = []
  const today = new Date(); today.setHours(0,0,0,0)

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const day     = d.getDay()
    result.push({ date: dateStr, minutes: minuteMap[dateStr] ?? 0, week: 11 - Math.floor(i / 7), day })
  }
  return result
}

// ── Summary stats for stat cards ─────────────────────────────

export interface AnalyticsSummary {
  totalStudyMinutesThisWeek:  number
  totalStudyMinutesThisMonth: number
  avgQuizScore:               number
  totalFlashcardsMastered:    number
  currentStreak:              number
  longestStreak:              number
}

export async function getAnalyticsSummary(userId: string): Promise<AnalyticsSummary> {
  const now        = new Date()
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 6);  weekStart.setHours(0,0,0,0)
  const monthStart = new Date(now); monthStart.setDate(1);                  monthStart.setHours(0,0,0,0)

  const [weekLogs, monthLogs, allAttempts, mastered, streak] = await Promise.all([
    supabase.from('study_logs').select('duration_min').eq('user_id', userId).gte('logged_at', weekStart.toISOString().slice(0,10)),
    supabase.from('study_logs').select('duration_min').eq('user_id', userId).gte('logged_at', monthStart.toISOString().slice(0,10)),
    supabase.from('quiz_attempts').select('score, total').eq('user_id', userId),
    supabase.from('flashcards').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('mastered', true),
    getStudyStreak(userId),
  ])

  const weekMin  = (weekLogs.data  ?? []).reduce((s, r) => s + ((r.duration_min as number) ?? 0), 0)
  const monthMin = (monthLogs.data ?? []).reduce((s, r) => s + ((r.duration_min as number) ?? 0), 0)

  const attempts = allAttempts.data ?? []
  const totalCorrect = attempts.reduce((s, a) => s + ((a.score as number) ?? 0), 0)
  const totalQ       = attempts.reduce((s, a) => s + ((a.total as number) ?? 0), 0)
  const avgScore     = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0

  return {
    totalStudyMinutesThisWeek:  weekMin,
    totalStudyMinutesThisMonth: monthMin,
    avgQuizScore:               avgScore,
    totalFlashcardsMastered:    mastered.count ?? 0,
    currentStreak:              streak.current,
    longestStreak:              streak.longest,
  }
}
