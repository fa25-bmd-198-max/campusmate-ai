import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Lightbulb, BookOpen, Target,
  Clock, ChevronDown, ChevronUp, CalendarPlus,
  AlertTriangle, RotateCcw,
} from 'lucide-react'
import { Badge, Button, Card, Input, Spinner } from '@/components/ui'
import { useCourses } from '@/hooks/useProfile'
import { useAuthContext } from '@/context/AuthContext'
import { generateStructuredOutput, Prompts, AssignmentBreakdownSchema } from '@/services/ai'
import { supabase } from '@/services/supabase'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { AssignmentBreakdown } from '@/types/ai.types'

// ── Collapsible section ────────────────────────────────────────
interface SectionProps {
  icon:       React.ReactNode
  title:      string
  badge?:     string
  children:   React.ReactNode
  defaultOpen?: boolean
  accent?:    'blue' | 'purple' | 'emerald' | 'amber' | 'orange'
}

const ACCENT_CLASSES = {
  blue:    'border-blue-200   bg-blue-50   dark:border-blue-800   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300',
  purple:  'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  emerald: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  amber:   'border-amber-200  bg-amber-50  dark:border-amber-800  dark:bg-amber-900/20  text-amber-700  dark:text-amber-300',
  orange:  'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
}

function CollapsibleSection({ icon, title, badge, children, defaultOpen = true, accent = 'blue' }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const colors = ACCENT_CLASSES[accent]

  return (
    <div className={cn('overflow-hidden rounded-xl border', colors)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <span className="shrink-0">{icon}</span>
          <span className="font-semibold">{title}</span>
          {badge && (
            <Badge color="default" size="sm" className="ml-1">{badge}</Badge>
          )}
        </span>
        {open
          ? <ChevronUp  className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
          : <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-current border-opacity-20 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function AssignmentAssistantPage() {
  const { user }           = useAuthContext()
  const { data: courses = [] } = useCourses()
  const navigate             = useNavigate()

  // Form state
  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [deadline,    setDeadline]    = useState('')
  const [course,      setCourse]      = useState('')

  // AI state
  const [breakdown,  setBreakdown]  = useState<AssignmentBreakdown | null>(null)
  const [analyzing,  setAnalyzing]  = useState(false)
  const [aiError,    setAiError]    = useState<string | null>(null)

  // Save state
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  const canAnalyze = title.trim().length > 0 && description.trim().length > 0 && !analyzing

  // ── 3.4.2 AI analysis ──────────────────────────────────────
  const handleAnalyze = async () => {
    if (!canAnalyze) return
    setAnalyzing(true)
    setAiError(null)
    setBreakdown(null)
    setSaved(false)

    try {
      const result = await generateStructuredOutput<AssignmentBreakdown>(
        Prompts.assignmentBreakdown(
          title.trim(),
          description.trim(),
          deadline || 'not specified',
          course || 'not specified',
        ),
        AssignmentBreakdownSchema,
      )
      setBreakdown(result)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setBreakdown(null)
    setAiError(null)
    setSaved(false)
    setTitle('')
    setDescription('')
    setDeadline('')
    setCourse('')
  }

  // ── 3.4.3 Save subtasks as calendar events ─────────────────
  const handleSaveAsTasks = async () => {
    if (!breakdown || !user || !deadline) {
      toast.error('Set a deadline before saving tasks to calendar.')
      return
    }

    setSaving(true)
    try {
      const eventRows = breakdown.subtasks.map((task, i) => {
        // Spread tasks evenly between now and the deadline
        const deadlineDate = new Date(deadline)
        const today        = new Date()
        const totalDays    = Math.max(1, Math.round((deadlineDate.getTime() - today.getTime()) / 86_400_000))
        const dayOffset    = Math.round((i / breakdown.subtasks.length) * totalDays)
        const taskDate     = new Date(today)
        taskDate.setDate(today.getDate() + dayOffset)
        taskDate.setHours(10, 0, 0, 0)

        return {
          user_id:    user.id,
          title:      task.length > 80 ? task.slice(0, 77) + '…' : task,
          event_type: 'assignment',
          starts_at:  taskDate.toISOString(),
          ends_at:    new Date(taskDate.getTime() + 60 * 60 * 1000).toISOString(), // 1h block
          notes:      `From assignment: ${title}`,
        }
      })

      // Also add the final deadline event
      eventRows.push({
        user_id:    user.id,
        title:      `📋 DEADLINE: ${title}`,
        event_type: 'assignment',
        starts_at:  new Date(`${deadline}T23:59:00`).toISOString(),
        ends_at:    new Date(`${deadline}T23:59:00`).toISOString(),
        notes:      `Assignment deadline${course ? ` — ${course}` : ''}`,
      })

      const { error } = await supabase.from('calendar_events').insert(eventRows)
      if (error) throw error

      setSaved(true)
      toast.success(`${breakdown.subtasks.length} tasks + deadline saved to calendar!`)
      setTimeout(() => navigate('/calendar'), 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save tasks.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">
          Assignment Assistant
        </h1>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
          AI breaks down your assignment into tasks, research directions, and a timeline
        </p>
      </div>

      {/* ── 3.4.1 Input form ─────────────────────────────── */}
      <Card padding="lg">
        <div className="space-y-4">
          <Input
            label="Assignment title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Research Paper on Machine Learning Ethics"
            disabled={analyzing}
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Assignment description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste or type the full assignment requirements here…"
              rows={6}
              disabled={analyzing}
              required
              aria-label="Assignment description"
              className={cn(
                'w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm',
                'placeholder:text-gray-400',
                'focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            />
            <p className="mt-1 text-xs text-gray-400">{description.length} characters</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                disabled={analyzing}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Course
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                disabled={analyzing}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 disabled:opacity-60"
              >
                <option value="">Select course (optional)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              loading={analyzing}
              className="flex-1 sm:flex-none"
              leftIcon={analyzing ? undefined : <ClipboardList className="h-4 w-4" />}
            >
              {analyzing ? 'Analysing…' : 'Analyse assignment'}
            </Button>
            {(breakdown || aiError) && (
              <Button variant="ghost" onClick={handleReset} leftIcon={<RotateCcw className="h-4 w-4" />}>
                New assignment
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Analyzing indicator */}
      {analyzing && (
        <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-5 py-4 dark:border-primary-800 dark:bg-primary-900/20">
          <Spinner size="md" color="primary" />
          <div>
            <p className="text-sm font-medium text-primary-800 dark:text-primary-300">
              AI is breaking down your assignment…
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400 opacity-75">
              This usually takes 10–15 seconds
            </p>
          </div>
        </div>
      )}

      {/* AI Error */}
      {aiError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">Analysis failed</p>
            <p className="mt-0.5 text-sm text-red-600 dark:text-red-500">{aiError}</p>
            <button
              onClick={handleAnalyze}
              className="mt-2 text-xs font-medium text-red-700 underline underline-offset-2 hover:text-red-600 dark:text-red-400"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── 3.4.2 AI breakdown results ────────────────────── */}
      {breakdown && (
        <div className="space-y-3" aria-live="polite">
          {/* Understanding */}
          <CollapsibleSection
            icon={<BookOpen className="h-5 w-5" />}
            title="Understanding the assignment"
            accent="blue"
            defaultOpen
          >
            <p className="text-sm leading-relaxed">{breakdown.understanding}</p>
          </CollapsibleSection>

          {/* Subtasks */}
          <CollapsibleSection
            icon={<ClipboardList className="h-5 w-5" />}
            title="Subtask breakdown"
            badge={`${breakdown.subtasks.length} tasks`}
            accent="purple"
            defaultOpen
          >
            <ol className="space-y-2" role="list">
              {breakdown.subtasks.map((task, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current bg-opacity-15 text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{task}</span>
                </li>
              ))}
            </ol>
          </CollapsibleSection>

          {/* Research directions */}
          <CollapsibleSection
            icon={<Lightbulb className="h-5 w-5" />}
            title="Research directions"
            badge={`${breakdown.research_directions.length} suggestions`}
            accent="amber"
            defaultOpen={false}
          >
            <ul className="space-y-2" role="list">
              {breakdown.research_directions.map((dir, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
                  <span className="leading-relaxed">{dir}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>

          {/* Key concepts */}
          <CollapsibleSection
            icon={<Target className="h-5 w-5" />}
            title="Key concepts to understand"
            badge={`${breakdown.key_concepts.length} concepts`}
            accent="emerald"
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-2">
              {breakdown.key_concepts.map((concept) => (
                <span
                  key={concept}
                  className="rounded-full bg-current bg-opacity-15 px-3 py-1 text-xs font-medium"
                >
                  {concept}
                </span>
              ))}
            </div>
          </CollapsibleSection>

          {/* Suggested timeline */}
          <CollapsibleSection
            icon={<Clock className="h-5 w-5" />}
            title="Suggested timeline"
            accent="orange"
            defaultOpen
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {breakdown.timeline}
            </p>
          </CollapsibleSection>

          {/* ── 3.4.3 Save as tasks ──────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-800/50">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Save subtasks to your calendar
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {deadline
                  ? `${breakdown.subtasks.length} tasks spread until ${deadline}, plus a deadline event`
                  : 'Set a deadline above to enable this feature'}
              </p>
            </div>
            <Button
              variant={saved ? 'secondary' : 'primary'}
              size="sm"
              onClick={handleSaveAsTasks}
              loading={saving}
              disabled={!deadline || saving || saved}
              leftIcon={saved ? undefined : <CalendarPlus className="h-4 w-4" />}
            >
              {saved
                ? '✓ Saved to calendar'
                : saving
                ? 'Saving…'
                : 'Save as calendar tasks'}
            </Button>
          </div>

          {/* ── 3.4.4 Academic integrity disclaimer ──────── */}
          <div
            role="note"
            aria-label="Academic integrity notice"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-700 dark:bg-amber-900/20"
          >
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Academic integrity notice
              </p>
              <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
                This breakdown is for <strong>planning purposes only</strong>. Do not submit
                AI-generated text as your own academic work. Always write your submissions
                in your own words and follow your institution's academic integrity policy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
