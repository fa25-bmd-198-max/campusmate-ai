import { supabase } from './supabase'
import { generateStructuredOutput, Prompts, StudyPlanSchema } from './ai'
import type { StudyPlanRow, StudySessionRow } from '@/types/planner.types'
import type { PlannerInput, PlanDay } from '@/types/planner.types'
import type { StudyPlanDay } from '@/types/ai.types'

// ── Fetch ─────────────────────────────────────────────────────

export async function getActivePlan(userId: string): Promise<StudyPlanRow | null> {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as StudyPlanRow | null
}

export async function getPlanSessions(planId: string): Promise<StudySessionRow[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('plan_id', planId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as StudySessionRow[]
}

export async function updateSessionComplete(
  sessionId: string,
  completed: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('study_sessions')
    .update({ completed })
    .eq('id', sessionId)
  if (error) throw error

  // Log study time when marking complete
  if (completed) {
    try {
      const { data: sess } = await supabase
        .from('study_sessions')
        .select('duration_min, subject, user_id')
        .eq('id', sessionId)
        .maybeSingle()
      if (sess?.duration_min) {
        await supabase.from('study_logs').insert({
          user_id:      sess.user_id,
          session_id:   sessionId,
          subject:      sess.subject,
          duration_min: sess.duration_min,
          logged_at:    new Date().toISOString().slice(0, 10),
        })
      }
    } catch { /* study log is non-fatal */ }
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('study_sessions').delete().eq('id', sessionId)
  if (error) throw error
}

export async function deletePlan(planId: string): Promise<void> {
  // Sessions cascade-delete via FK
  const { error } = await supabase.from('study_plans').delete().eq('id', planId)
  if (error) throw error
}

// ── Group sessions by date ────────────────────────────────────
export function groupSessionsByDate(sessions: StudySessionRow[]): PlanDay[] {
  const map = new Map<string, StudySessionRow[]>()
  sessions.forEach((s) => {
    const date = s.scheduled_at ? s.scheduled_at.slice(0, 10) : 'unknown'
    if (!map.has(date)) map.set(date, [])
    map.get(date)!.push(s)
  })
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({
      date,
      sessions: sessions.map((s) => ({
        id:           s.id,
        subject:      s.subject,
        topic:        s.topic,
        session_type: s.session_type,
        duration_min: s.duration_min,
        completed:    s.completed,
        scheduled_at: s.scheduled_at,
      })),
    }))
}

// ── Generation pipeline ───────────────────────────────────────

export async function generateAndSavePlan(
  userId: string,
  input:  PlannerInput,
): Promise<StudyPlanRow> {
  const today   = new Date()
  const startDate = today.toISOString().slice(0, 10)

  // Find the latest exam date to set the plan end
  let maxExamDate = startDate
  input.subjects.forEach((s) => {
    if (s.examDate > maxExamDate) maxExamDate = s.examDate
  })

  // Build availability string for prompt
  const DAY_NAMES: Record<string, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
    thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
  }
  const availableDays = Object.entries(input.availability)
    .filter(([, v]) => v)
    .map(([k]) => DAY_NAMES[k] ?? k)
    .join(', ')

  const subjectsWithDates = input.subjects
    .map((s) => `${s.name} (exam: ${s.examDate})`)
    .join('; ')

  // 1. AI plan generation
  const aiPlan: StudyPlanDay[] = await generateStructuredOutput(
    Prompts.studyPlan({
      subjectsWithDates,
      weakTopics:   input.weakTopics || 'none specified',
      availability: `${availableDays}, ${input.studyHours} hours/day`,
      goals:        input.goals || 'pass exams',
      startDate,
      endDate:      maxExamDate,
    }),
    StudyPlanSchema,
  )

  if (aiPlan.length === 0) throw new Error('AI returned an empty study plan.')

  // 2. Delete old plans before saving new one
  const existingPlan = await getActivePlan(userId)
  if (existingPlan) await deletePlan(existingPlan.id)

  // 3. Save plan record
  const { data: planData, error: planErr } = await supabase
    .from('study_plans')
    .insert({
      user_id: userId,
      title:   `Study plan — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      config:  input as unknown as Record<string, unknown>,
    })
    .select()
    .single()
  if (planErr) throw planErr
  const plan = planData as StudyPlanRow

  // 4. Build session rows
  const sessionRows = aiPlan.flatMap((day) =>
    day.sessions.map((sess) => {
      const dateTime = new Date(`${day.date}T09:00:00`)
      return {
        user_id:      userId,
        plan_id:      plan.id,
        subject:      sess.subject,
        topic:        sess.topic,
        session_type: sess.type,
        scheduled_at: dateTime.toISOString(),
        duration_min: sess.duration_min,
        completed:    false,
      }
    }),
  )

  // 5. Insert in chunks to avoid row limits
  const CHUNK = 50
  for (let i = 0; i < sessionRows.length; i += CHUNK) {
    const { error } = await supabase.from('study_sessions').insert(sessionRows.slice(i, i + CHUNK))
    if (error) {
      await deletePlan(plan.id)
      throw error
    }
  }

  // 6. Mirror sessions into calendar_events
  const calendarRows = aiPlan.flatMap((day) =>
    day.sessions
      .filter((s) => s.type !== 'rest')
      .map((sess) => ({
        user_id:    userId,
        title:      `${sess.subject}: ${sess.topic}`,
        event_type: 'study',
        starts_at:  new Date(`${day.date}T09:00:00`).toISOString(),
        ends_at:    new Date(`${day.date}T09:00:00`).toISOString(),
        notes:      `${sess.duration_min} min · ${sess.type}`,
      })),
  )
  if (calendarRows.length > 0) {
    for (let i = 0; i < calendarRows.length; i += CHUNK) {
      try { await supabase.from('calendar_events').insert(calendarRows.slice(i, i + CHUNK)) } catch { /* non-fatal */ }
    }
  }

  return plan
}
