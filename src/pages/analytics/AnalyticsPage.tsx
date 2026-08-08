import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Flame, Clock, ClipboardCheck, Layers, TrendingUp } from 'lucide-react'
import { Badge, Card, Skeleton } from '@/components/ui'
import { useAuthContext } from '@/context/AuthContext'
import {
  getAnalyticsSummary,
  getStudyHoursSummary,
  getQuizPerformance,
  getSubjectProgress,
  getHeatmapData,
} from '@/services/analyticsService'
import { cn } from '@/utils/cn'
import { formatMinutes } from '@/utils/formatters'

// ── Query keys ────────────────────────────────────────────────
const aKeys = {
  summary:   (u: string) => ['analytics', 'summary',  u] as const,
  hours:     (u: string) => ['analytics', 'hours',    u] as const,
  quizPerf:  (u: string) => ['analytics', 'quizperf', u] as const,
  subjects:  (u: string) => ['analytics', 'subjects', u] as const,
  heatmap:   (u: string) => ['analytics', 'heatmap',  u] as const,
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, accent = false,
}: {
  icon:    React.ReactNode
  label:   string
  value:   string | number
  sub?:    string
  accent?: boolean
}) {
  return (
    <Card padding="md" className={cn(accent && 'border-primary-200 bg-primary-50/40 dark:border-primary-800 dark:bg-primary-900/10')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accent ? 'bg-primary-100 dark:bg-primary-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
          {icon}
        </span>
      </div>
    </Card>
  )
}

// ── Confidence badge ──────────────────────────────────────────
function ConfidenceBadge({ level }: { level: 'Strong' | 'Developing' | 'Needs Focus' }) {
  const map = { Strong: 'success', Developing: 'warning', 'Needs Focus': 'error' } as const
  return <Badge color={map[level]} size="sm" dot>{level}</Badge>
}

// ── Mini progress ring (SVG, no library) ─────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const off  = circ - (pct / 100) * circ
  const col  = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" className="dark:stroke-gray-700" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={col} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[11px] font-bold text-gray-700 dark:text-gray-300">{pct}%</span>
    </div>
  )
}

// ── Study hours bar chart ─────────────────────────────────────
function StudyHoursChart({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: aKeys.hours(userId),
    queryFn:  () => getStudyHoursSummary(userId, 30),
  })

  if (isLoading) return <Skeleton.Block className="h-56" />

  const today = new Date().toISOString().slice(0, 10)
  const chartData = data.map((d) => ({
    date:  new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mins:  d.total_minutes,
    today: d.date === today,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false}
          interval={4} />
        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}
          tickFormatter={(v) => `${v}m`} />
        <Tooltip
          formatter={(v: number) => [formatMinutes(v), 'Study time']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="mins" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.today ? '#4f46e5' : '#a5b4fc'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Quiz performance line chart ───────────────────────────────
function QuizPerfChart({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: aKeys.quizPerf(userId),
    queryFn:  () => getQuizPerformance(userId),
  })

  if (isLoading) return <Skeleton.Block className="h-56" />
  if (data.length === 0) return (
    <div className="flex h-40 items-center justify-center text-sm text-gray-400 dark:text-gray-600">
      No quiz data yet
    </div>
  )

  return (
    <div className="space-y-3">
      {data.map((subj) => (
        <div key={subj.subject} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className={cn('font-medium', subj.avg_score < 60 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200')}>
              {subj.subject}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{subj.attempt_count} attempt{subj.attempt_count !== 1 ? 's' : ''}</span>
              <Badge color={subj.avg_score >= 80 ? 'success' : subj.avg_score >= 60 ? 'warning' : 'error'} size="sm">
                {subj.avg_score}%
              </Badge>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className={cn('h-full rounded-full transition-all',
              subj.avg_score >= 80 ? 'bg-emerald-500' : subj.avg_score >= 60 ? 'bg-amber-500' : 'bg-red-500')}
              style={{ width: `${subj.avg_score}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Subject progress cards ────────────────────────────────────
function SubjectProgressSection({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: aKeys.subjects(userId),
    queryFn:  () => getSubjectProgress(userId),
  })

  if (isLoading) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1,2,3].map(i => <Skeleton.Card key={i} />)}
    </div>
  )

  if (data.length === 0) return (
    <p className="text-sm text-gray-400 dark:text-gray-600 py-4">
      Complete some study activities to see subject progress.
    </p>
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((subj) => (
        <Card key={subj.subject} padding="md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900 dark:text-gray-100">{subj.subject}</p>
              <div className="mt-1.5">
                <ConfidenceBadge level={subj.confidence} />
              </div>
            </div>
            <ProgressRing pct={subj.quiz_avg} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{subj.study_hours}h</p>
              <p className="text-[10px] text-gray-500">Study time</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{subj.quiz_avg}%</p>
              <p className="text-[10px] text-gray-500">Quiz avg</p>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {subj.flashcards_mastered}/{subj.flashcards_total}
              </p>
              <p className="text-[10px] text-gray-500">Flashcards</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ── Streak heatmap (12 weeks × 7 days) ───────────────────────
function StreakHeatmap({ userId }: { userId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: aKeys.heatmap(userId),
    queryFn:  () => getHeatmapData(userId),
  })

  if (isLoading) return <Skeleton.Block className="h-28" />

  // Build 12-column × 7-row grid
  const weeks: Array<Array<{ date: string; minutes: number } | null>> = Array.from({ length: 12 }, () => Array(7).fill(null))
  data.forEach((d) => {
    if (d.week >= 0 && d.week < 12 && d.day >= 0 && d.day < 7) {
      weeks[d.week][d.day] = { date: d.date, minutes: d.minutes }
    }
  })

  const maxMin = Math.max(...data.map(d => d.minutes), 1)

  const cellColor = (minutes: number) => {
    if (minutes === 0) return 'bg-gray-100 dark:bg-gray-800'
    const intensity = minutes / maxMin
    if (intensity > 0.75) return 'bg-primary-600'
    if (intensity > 0.50) return 'bg-primary-400'
    if (intensity > 0.25) return 'bg-primary-300'
    return 'bg-primary-200 dark:bg-primary-900'
  }

  const dayLabels = ['S','M','T','W','T','F','S']
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 pr-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="flex h-4 w-4 items-center justify-center text-[9px] text-gray-400">{i % 2 === 1 ? d : ''}</div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((cell, di) => (
              <div
                key={di}
                title={cell ? `${cell.date}: ${formatMinutes(cell.minutes)}` : ''}
                className={cn(
                  'h-4 w-4 rounded-sm transition-colors',
                  cell ? cellColor(cell.minutes) : 'bg-gray-100 dark:bg-gray-800',
                  cell?.date === today && 'ring-1 ring-primary-600 ring-offset-1',
                )}
                aria-label={cell ? `${cell.date}: ${formatMinutes(cell.minutes)} studied` : 'No data'}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
        <span>Less</span>
        {['bg-gray-100 dark:bg-gray-800','bg-primary-200','bg-primary-300','bg-primary-400','bg-primary-600'].map((c, i) => (
          <span key={i} className={cn('h-3 w-3 rounded-sm', c)} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

// ── Main AnalyticsPage ────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuthContext()
  const uid      = user?.id ?? ''

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: aKeys.summary(uid),
    queryFn:  () => getAnalyticsSummary(uid),
    enabled:  !!uid,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Progress Analytics</h1>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
          Track your study habits, quiz performance, and learning consistency
        </p>
      </div>

      {/* ── Summary stat cards ─── */}
      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1,2,3,4,5,6].map(i => <Skeleton.Block key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />} label="Current streak"
            value={`${summary.currentStreak}d`} sub={`Longest: ${summary.longestStreak}d`} accent />
          <StatCard icon={<Clock className="h-5 w-5 text-blue-500" />} label="This week"
            value={formatMinutes(summary.totalStudyMinutesThisWeek)} sub="study time" />
          <StatCard icon={<Clock className="h-5 w-5 text-indigo-500" />} label="This month"
            value={formatMinutes(summary.totalStudyMinutesThisMonth)} sub="study time" />
          <StatCard icon={<ClipboardCheck className="h-5 w-5 text-emerald-500" />} label="Avg quiz score"
            value={`${summary.avgQuizScore}%`} sub="across all subjects" />
          <StatCard icon={<Layers className="h-5 w-5 text-secondary-500" />} label="Cards mastered"
            value={summary.totalFlashcardsMastered} sub="flashcards" />
          <StatCard icon={<TrendingUp className="h-5 w-5 text-primary-500" />} label="Longest streak"
            value={`${summary.longestStreak}d`} sub="personal best" />
        </div>
      ) : null}

      {/* ── Two-column charts section ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Study hours bar chart */}
        <Card>
          <div className="mb-4">
            <h2 className="text-h3 font-semibold text-gray-900 dark:text-gray-100">Daily Study Hours</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Last 30 days · today highlighted in indigo</p>
          </div>
          <StudyHoursChart userId={uid} />
        </Card>

        {/* Quiz performance per subject */}
        <Card>
          <div className="mb-4">
            <h2 className="text-h3 font-semibold text-gray-900 dark:text-gray-100">Quiz Performance</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Average score per subject · red = below 60%</p>
          </div>
          <QuizPerfChart userId={uid} />
        </Card>
      </div>

      {/* ── Activity heatmap ─── */}
      <Card>
        <div className="mb-4">
          <h2 className="text-h3 font-semibold text-gray-900 dark:text-gray-100">Study Consistency</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Last 12 weeks · colour intensity = study time</p>
        </div>
        <StreakHeatmap userId={uid} />
      </Card>

      {/* ── Subject progress cards ─── */}
      <div>
        <h2 className="mb-4 text-h3 font-semibold text-gray-900 dark:text-gray-100">Subject Progress</h2>
        <SubjectProgressSection userId={uid} />
      </div>
    </div>
  )
}
