import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  generateAndSavePlan, getActivePlan, getPlanSessions,
  updateSessionComplete, deleteSession, groupSessionsByDate,
} from '@/services/plannerService'
import { Button, Card, Modal, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { cn } from '@/utils/cn'
import { formatDate, formatMinutes } from '@/utils/formatters'
import toast from 'react-hot-toast'
import {
  Plus, Trash2, CalendarDays, CheckSquare, Square,
  AlertTriangle, RefreshCw, Loader2,
} from 'lucide-react'
import type { PlannerInput, SubjectEntry } from '@/types/planner.types'

// ── Query keys ────────────────────────────────────────────────
const planKeys = {
  active:   (uid: string) => ['study_plan',      uid] as const,
  sessions: (id: string)  => ['study_sessions',  id]  as const,
}

// ── Session type badge colors ─────────────────────────────────
const SESSION_COLOR: Record<string, string> = {
  revision:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  practice_test: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  rest:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

const DAY_KEYS = ['mon','tue','wed','thu','fri','sat','sun'] as const
const DAY_LABELS: Record<string, string> = {
  mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun',
}

// ── ─────────────────── PLANNER INPUT FORM ──────────────────────── ──

function PlannerForm({ onGenerated }: { onGenerated: () => void }) {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  const [subjects,    setSubjects]    = useState<SubjectEntry[]>([{ name: '', examDate: '' }])
  const [availability,setAvailability]= useState<Record<string, boolean>>(
    Object.fromEntries(DAY_KEYS.map((d) => [d, d !== 'sat' && d !== 'sun'])),
  )
  const [studyHours, setStudyHours]   = useState(4)
  const [weakTopics, setWeakTopics]   = useState('')
  const [goals,      setGoals]        = useState('')
  const [generating, setGenerating]   = useState(false)
  const [error,      setError]        = useState<string | null>(null)

  const addSubject    = () => setSubjects((p) => [...p, { name: '', examDate: '' }])
  const removeSubject = (i: number) => setSubjects((p) => p.filter((_, j) => j !== i))
  const updateSubject = (i: number, field: keyof SubjectEntry, val: string) =>
    setSubjects((p) => p.map((s, j) => j === i ? { ...s, [field]: val } : s))

  const handleGenerate = async () => {
    const validSubjects = subjects.filter((s) => s.name.trim() && s.examDate)
    if (validSubjects.length === 0) { toast.error('Add at least one subject with an exam date.'); return }
    if (!Object.values(availability).some(Boolean)) { toast.error('Select at least one available day.'); return }
    if (!user) return

    setGenerating(true)
    setError(null)

    const input: PlannerInput = {
      subjects: validSubjects,
      availability,
      studyHours,
      weakTopics,
      goals,
    }

    try {
      await generateAndSavePlan(user.id, input)
      queryClient.invalidateQueries({ queryKey: planKeys.active(user.id) })
      toast.success('Study plan generated!')
      onGenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plan generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">AI Study Planner</h1>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
          Tell us your schedule and AI will create a personalised day-by-day study plan
        </p>
      </div>

      {/* Subjects */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Subjects & exam dates
          </h2>
          <Button variant="ghost" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={addSubject}>
            Add subject
          </Button>
        </div>
        <div className="space-y-3">
          {subjects.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  value={s.name}
                  onChange={(e) => updateSubject(i, 'name', e.target.value)}
                  placeholder="Subject name"
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <input
                  type="date"
                  value={s.examDate}
                  onChange={(e) => updateSubject(i, 'examDate', e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>
              {subjects.length > 1 && (
                <button onClick={() => removeSubject(i)} aria-label="Remove subject"
                  className="mt-2 text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Availability */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Available days
        </h2>
        <div className="flex flex-wrap gap-2">
          {DAY_KEYS.map((day) => (
            <button key={day} type="button"
              onClick={() => setAvailability((p) => ({ ...p, [day]: !p[day] }))}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors',
                availability[day]
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
              )}>
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Study hours per day: <span className="text-primary-600 font-bold">{studyHours}h</span>
          </label>
          <input type="range" min={1} max={12} value={studyHours}
            aria-label={`Study hours per day: ${studyHours}`}
            aria-valuemin={1} aria-valuemax={12} aria-valuenow={studyHours}
            onChange={(e) => setStudyHours(Number(e.target.value))}
            className="w-full accent-primary-600" />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>1h</span><span>6h</span><span>12h</span>
          </div>
        </div>
      </Card>

      {/* Weak topics */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Weak topics <span className="font-normal normal-case text-gray-400">(optional)</span>
        </h2>
        <textarea value={weakTopics} onChange={(e) => setWeakTopics(e.target.value)} rows={2}
          placeholder="e.g. Dynamic programming, Fourier transforms, Organic reactions…"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
      </Card>

      {/* Goals */}
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Academic goals <span className="font-normal normal-case text-gray-400">(optional)</span>
        </h2>
        <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={2}
          placeholder="e.g. Pass all exams with distinction, improve understanding of algorithms…"
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div><p className="font-medium">Generation failed</p><p className="mt-0.5">{error}</p></div>
        </div>
      )}

      {/* Generate button */}
      <Button fullWidth size="lg" onClick={handleGenerate} loading={generating}>
        {generating ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your personalised plan…
          </span>
        ) : 'Generate study plan'}
      </Button>

      {generating && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          This may take up to 15 seconds — AI is building your day-by-day schedule
        </p>
      )}
    </div>
  )
}

// ── ─────────────────── PLAN DISPLAY ──────────────────────────── ──

function PlanDisplay({
  planId,
  onRegenerate,
}: {
  planId:       string
  onRegenerate: () => void
}) {
  const queryClient = useQueryClient()
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: planKeys.sessions(planId),
    queryFn:  () => getPlanSessions(planId),
  })

  const toggleComplete = useCallback(async (sessionId: string, completed: boolean) => {
    await updateSessionComplete(sessionId, !completed)
    queryClient.invalidateQueries({ queryKey: planKeys.sessions(planId) })
  }, [planId, queryClient])

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId)
      queryClient.invalidateQueries({ queryKey: planKeys.sessions(planId) })
      toast.success('Session removed')
    } finally {
      setDeletingId(null)
    }
  }, [planId, queryClient])

  const grouped = groupSessionsByDate(sessions)
  const completed = sessions.filter((s) => s.completed).length

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" color="primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Your Study Plan</h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            {completed}/{sessions.length} sessions completed
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => setConfirmRegen(true)}
        >
          Regenerate plan
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-500"
          style={{ width: sessions.length > 0 ? `${(completed / sessions.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { type: 'revision',      label: 'Revision'      },
          { type: 'practice_test', label: 'Practice Test' },
          { type: 'rest',          label: 'Rest / Break'  },
        ].map((t) => (
          <span key={t.type} className={cn('rounded-full px-2.5 py-1 font-medium', SESSION_COLOR[t.type])}>
            {t.label}
          </span>
        ))}
      </div>

      {/* Days */}
      {grouped.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="No sessions in your plan"
          description="Your plan may have been generated with no available days. Try regenerating with different settings."
        />
      ) : (
        grouped.map((day) => (
          <Card key={day.date} padding="none" className="overflow-hidden">
            {/* Day header */}
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formatDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>

            {/* Sessions */}
            <ul className="divide-y divide-gray-100 dark:divide-gray-800" role="list">
              {day.sessions.map((sess) => (
                <li key={sess.id} className={cn(
                  'flex items-center gap-3 px-5 py-3 transition-colors group',
                  sess.completed && 'opacity-60',
                )}>
                  {/* Complete toggle */}
                  <button
                    onClick={() => toggleComplete(sess.id, sess.completed)}
                    aria-label={sess.completed ? 'Mark incomplete' : 'Mark complete'}
                    className="shrink-0 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                  >
                    {sess.completed
                      ? <CheckSquare className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      : <Square      className="h-5 w-5" />}
                  </button>

                  {/* Content */}
                  <div className={cn('min-w-0 flex-1', sess.completed && 'line-through')}>
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {sess.subject && <span className="mr-1 font-semibold text-primary-700 dark:text-primary-400">{sess.subject}:</span>}
                      {sess.topic}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {sess.duration_min ? formatMinutes(sess.duration_min) : ''}
                    </p>
                  </div>

                  {/* Type badge */}
                  {sess.session_type && (
                    <span className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
                      SESSION_COLOR[sess.session_type] ?? '',
                    )}>
                      {sess.session_type.replace('_', ' ')}
                    </span>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteSession(sess.id)}
                    aria-label="Remove session"
                    disabled={deletingId === sess.id}
                    className="shrink-0 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}

      {/* Regenerate confirm */}
      <Modal
        open={confirmRegen}
        onClose={() => setConfirmRegen(false)}
        title="Regenerate study plan?"
        description="Your current plan will be replaced with a new one."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmRegen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { setConfirmRegen(false); onRegenerate() }}>
              Regenerate
            </Button>
          </div>
        }
      >
        <p className="text-body text-gray-600 dark:text-gray-400">
          This action cannot be undone. Your session completion history will be lost.
        </p>
      </Modal>
    </div>
  )
}

// ── ─────────────────── MAIN PAGE ──────────────────────────────── ──
export default function StudyPlannerPage() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  const { data: plan, isLoading } = useQuery({
    queryKey: planKeys.active(user?.id ?? ''),
    queryFn:  () => getActivePlan(user!.id),
    enabled:  !!user?.id,
  })

  const [showForm, setShowForm] = useState(false)

  // Show form when no plan exists
  const showPlanForm = showForm || (!isLoading && !plan)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="xl" color="primary" />
      </div>
    )
  }

  if (showPlanForm) {
    return (
      <PlannerForm
        onGenerated={() => {
          setShowForm(false)
          queryClient.invalidateQueries({ queryKey: planKeys.active(user!.id) })
        }}
      />
    )
  }

  return (
    <PlanDisplay
      planId={plan!.id}
      onRegenerate={() => setShowForm(true)}
    />
  )
}
