import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Flame, CalendarDays, Layers, ClipboardCheck,
  UsersRound, Zap, FileText, RefreshCw, Square,
  AlertTriangle,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useProfile } from '@/hooks/useProfile'
import {
  useStudyStreak, useUpcomingEvents, useTodayTasks,
  useRecentNotes, useRecentQuizzes, useFlashcardsDue, useGroupActivity,
} from '@/hooks/useDashboard'
import { daysUntil, formatRelativeTime, scoreToPercent, scoreColor, formatDate } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import type { CalendarEventRow } from '@/types/database.types'

// ── Greeting ──────────────────────────────────────────────────
function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// ── File type icon color ──────────────────────────────────────
const FILE_COLOR: Record<string, string> = {
  pdf:  'text-red-500', docx: 'text-blue-500',
  pptx: 'text-orange-500', txt: 'text-gray-500',
}

// ── Widget: Study Streak ──────────────────────────────────────
function StudyStreakCard() {
  const { data, isLoading } = useStudyStreak()
  if (isLoading) return <Skeleton.Block className="h-32" />
  const { current = 0, longest = 0 } = data ?? {}

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Study Streak</h2>
        <Flame className={cn('h-5 w-5', current > 0 ? 'text-orange-500' : 'text-gray-300')} aria-hidden="true" />
      </div>
      <div className="mt-3">
        <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {current}<span className="ml-1 text-lg font-medium text-gray-500">day{current !== 1 ? 's' : ''}</span>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {current > 0
            ? current >= 7 ? '🔥 You\'re on fire! Keep it up!' : 'Keep going — you\'re building momentum!'
            : 'Start studying today to begin your streak!'}
        </p>
      </div>
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-600">
        Longest: <span className="font-medium text-gray-600 dark:text-gray-400">{longest} days</span>
      </p>
    </Card>
  )
}

// ── Widget: Today's Tasks ─────────────────────────────────────
function TodayTasksCard() {
  const { data: tasks = [], isLoading } = useTodayTasks()

  const toggleTask = async (_event: CalendarEventRow) => {
    // Calendar events don't have completed state — mark via study session if linked
    // For now, optimistic visual toggle is handled in study sessions table
    toast('Task marked — full completion tracking available in the Planner', { icon: '📋' })
  }

  if (isLoading) return <Skeleton.Card />

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Today's Schedule</h2>
        <Link to="/calendar" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">View all</Link>
      </div>
      {tasks.length === 0
        ? <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No events today" description="Enjoy your free day or add something to your calendar!" className="py-6" />
        : (
          <ul className="mt-3 space-y-2" role="list">
            {tasks.map(task => (
              <li key={task.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                <button onClick={() => toggleTask(task)} aria-label="Toggle task" className="mt-0.5 shrink-0 text-gray-400 hover:text-primary-600">
                  <Square className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{task.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(task.starts_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                    {task.ends_at && ` – ${new Date(task.ends_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}`}
                  </p>
                </div>
                <Badge color={task.event_type === 'exam' ? 'error' : task.event_type === 'assignment' ? 'warning' : 'primary'} size="sm">
                  {task.event_type}
                </Badge>
              </li>
            ))}
          </ul>
        )}
    </Card>
  )
}

// ── Widget: Upcoming Exams ────────────────────────────────────
function UpcomingExamsCard() {
  const { data: exams = [], isLoading } = useUpcomingEvents()
  if (isLoading) return <Skeleton.Card />

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Upcoming Exams</h2>
        <Link to="/calendar" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">Calendar</Link>
      </div>
      {exams.length === 0
        ? <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No exams this week" description="Enjoy the break — or get ahead on revision!" className="py-6" />
        : (
          <ul className="mt-3 space-y-3" role="list">
            {exams.map(exam => {
              const d = daysUntil(exam.starts_at)
              return (
                <li key={exam.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{exam.title}</p>
                    <p className="text-xs text-gray-500">{formatDate(exam.starts_at)}</p>
                  </div>
                  <Badge color={d <= 1 ? 'error' : d <= 3 ? 'warning' : 'default'} size="sm" dot>
                    {d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`}
                  </Badge>
                </li>
              )
            })}
          </ul>
        )}
    </Card>
  )
}

// ── Widget: Recent Uploads ────────────────────────────────────
function RecentUploadsCard() {
  const { data: notes = [], isLoading } = useRecentNotes()
  if (isLoading) return <Skeleton.Card />

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recent Notes</h2>
        <Link to="/notes" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">View all</Link>
      </div>
      {notes.length === 0
        ? <EmptyState icon={<FileText className="h-6 w-6" />} title="No notes yet" description="Upload lecture notes to get AI summaries." className="py-6"
            action={<Link to="/notes"><Button size="sm" variant="secondary">Upload notes</Button></Link>} />
        : (
          <ul className="mt-3 space-y-3" role="list">
            {notes.map(note => (
              <li key={note.id}>
                <Link to={`/notes/${note.id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <FileText className={cn('h-5 w-5 shrink-0', FILE_COLOR[note.file_type ?? 'txt'])} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{note.title}</p>
                    <p className="text-xs text-gray-500">{note.subject ?? 'No subject'} · {formatRelativeTime(note.created_at)}</p>
                  </div>
                  <Badge color={note.status === 'ready' ? 'success' : note.status === 'processing' ? 'warning' : note.status === 'error' ? 'error' : 'default'} size="sm">
                    {note.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Card>
  )
}

// ── Widget: Recent Quizzes ────────────────────────────────────
function RecentQuizzesCard() {
  const { data: attempts = [], isLoading } = useRecentQuizzes()
  if (isLoading) return <Skeleton.Card />

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Recent Quizzes</h2>
        <Link to="/quiz" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">View all</Link>
      </div>
      {attempts.length === 0
        ? <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="No quizzes taken yet" description="Generate a quiz from your notes to test yourself." className="py-6"
            action={<Link to="/quiz"><Button size="sm" variant="secondary">Take a quiz</Button></Link>} />
        : (
          <ul className="mt-3 space-y-3" role="list">
            {attempts.map(attempt => {
              const pct = scoreToPercent(attempt.score, attempt.total)
              return (
                <li key={attempt.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {attempt.quiz?.title ?? 'Untitled Quiz'}
                    </p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(attempt.completed_at)}</p>
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums', scoreColor(pct))}>
                    {pct}%
                  </span>
                </li>
              )
            })}
          </ul>
        )}
    </Card>
  )
}

// ── Widget: Flashcards Due ────────────────────────────────────
function FlashcardsDueCard() {
  const { data: count = 0, isLoading } = useFlashcardsDue()
  const navigate = useNavigate()
  if (isLoading) return <Skeleton.Block className="h-32" />

  return (
    <Card className="flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Flashcards Due</h2>
        <Layers className="h-5 w-5 text-secondary-500" aria-hidden="true" />
      </div>
      <div className="mt-3">
        <p className="text-4xl font-bold text-gray-900 dark:text-gray-100">
          {count}<span className="ml-1 text-lg font-medium text-gray-500">cards</span>
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {count > 0 ? 'Ready for review' : 'All cards mastered 🎉'}
        </p>
      </div>
      <Button
        variant="secondary" size="sm" className="mt-4 self-start"
        onClick={() => navigate('/flashcards')}
        disabled={count === 0}
      >
        {count > 0 ? 'Review now' : 'View flashcards'}
      </Button>
    </Card>
  )
}

// ── Widget: Group Activity ────────────────────────────────────
function GroupActivityCard() {
  const { data: activity = [], isLoading } = useGroupActivity()
  if (isLoading) return <Skeleton.Card />

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Group Activity</h2>
        <Link to="/groups" className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">View all</Link>
      </div>
      {activity.length === 0
        ? <EmptyState icon={<UsersRound className="h-6 w-6" />} title="No group activity" description="Join a study group to see what's happening." className="py-6"
            action={<Link to="/groups"><Button size="sm" variant="secondary">Browse groups</Button></Link>} />
        : (
          <ul className="mt-3 space-y-3" role="list">
            {activity.map(({ group, lastMessage }) => (
              <li key={group.id}>
                <Link to={`/groups/${group.id}`} className="flex items-start gap-3 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xs font-semibold text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{group.name}</p>
                    <p className="truncate text-xs text-gray-500">
                      {lastMessage ? lastMessage.content : 'No messages yet'}
                    </p>
                  </div>
                  {lastMessage && (
                    <span className="shrink-0 text-xs text-gray-400">{formatRelativeTime(lastMessage.created_at)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Card>
  )
}

// ── Widget: AI Recommendations ────────────────────────────────
function AIRecommendationsCard() {
  const { profile }   = useProfile()
  const [recs, setRecs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const fetchRecs = async () => {
    setLoading(true); setError('')
    try {
      const { generateText } = await import('@/services/ai')
      const prompt = `You are an academic advisor for a student named ${profile?.full_name ?? 'a student'} 
at ${profile?.university ?? 'university'}, semester ${profile?.semester ?? 'unknown'}, studying ${profile?.degree ?? 'their degree'}.
Their weak subjects are: ${profile?.weak_subjects?.join(', ') || 'not specified'}.
Their goals are: ${profile?.academic_goals?.join(', ') || 'not specified'}.
Give exactly 5 specific, actionable study recommendations for this week.
Format as a JSON array of strings: ["rec1","rec2","rec3","rec4","rec5"]
Each recommendation should be under 15 words. Be direct and practical.`
      const text = await generateText(prompt)
      const match = text.match(/\[[\s\S]*?\]/)
      if (match) {
        const parsed = JSON.parse(match[0]) as string[]
        setRecs(parsed.slice(0, 5))
      } else {
        setRecs(text.split('\n').filter(Boolean).slice(0, 5))
      }
    } catch {
      setError('Could not load recommendations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">AI Recommendations</h2>
        <button
          onClick={fetchRecs} disabled={loading}
          aria-label="Refresh AI recommendations"
          className="rounded-md p-1 text-gray-400 hover:text-primary-600 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={fetchRecs} className="underline">Retry</button>
        </div>
      )}

      {recs.length === 0 && !loading && !error && (
        <div className="mt-4 flex flex-col items-center gap-3 py-4 text-center">
          <Zap className="h-8 w-8 text-secondary-400" aria-hidden="true" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Get personalised study recommendations powered by AI
          </p>
          <Button size="sm" onClick={fetchRecs} leftIcon={<Zap className="h-4 w-4" />}>
            Generate recommendations
          </Button>
        </div>
      )}

      {loading && (
        <div className="mt-4 space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton.Line key={i} className={i === 5 ? 'w-3/4' : ''} />)}
        </div>
      )}

      {recs.length > 0 && !loading && (
        <ul className="mt-4 space-y-2" role="list">
          {recs.map((rec, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                {i + 1}
              </span>
              {rec}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ── Main DashboardPage ────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useProfile()

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">
            {greeting()}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Avatar
          src={profile?.avatar_url}
          name={profile?.full_name ?? ''}
          size="lg"
          ring="sm"
        />
      </div>

      {/* Quick-stat strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StudyStreakCard />
        <FlashcardsDueCard />
        <UpcomingExamsCard />
        <TodayTasksCard />
      </div>

      {/* Main grid: 2 columns on md+, 1 on mobile */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <AIRecommendationsCard />
        <RecentUploadsCard />
        <RecentQuizzesCard />
        <GroupActivityCard />
      </div>
    </div>
  )
}
