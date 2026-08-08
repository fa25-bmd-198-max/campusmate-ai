import { useParams, Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, ArrowLeft, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useAttempt, useQuiz, useQuizQuestions } from '@/hooks/useQuiz'
import { buildPerformanceInsights } from '@/services/quizService'
import { cn } from '@/utils/cn'
import { scoreColor } from '@/utils/formatters'

// ── Score ring ────────────────────────────────────────────────
function ScoreRing({ pct }: { pct: number }) {
  const r         = 52
  const circumference = 2 * Math.PI * r
  const progress    = circumference - (pct / 100) * circumference
  const color       = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex h-36 w-36 items-center justify-center">
      <svg className="-rotate-90" width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn('text-3xl font-bold', scoreColor(pct))}>{pct}%</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Score</span>
      </div>
    </div>
  )
}

// ── Main result page ──────────────────────────────────────────
export default function QuizResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate      = useNavigate()

  const { data: attempt,   isLoading: aLoading } = useAttempt(attemptId)
  const { data: quiz,      isLoading: qLoading } = useQuiz(attempt?.quiz_id)
  const { data: questions = [], isLoading: qqLoading } = useQuizQuestions(attempt?.quiz_id)

  const isLoading = aLoading || qLoading || qqLoading

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Skeleton.Line className="h-8 w-64" />
        <Skeleton.Block className="h-48" />
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton.Block key={i} className="h-24" />)}</div>
      </div>
    )
  }

  if (!attempt || !quiz || questions.length === 0) {
    return (
      <div className="p-6">
        <EmptyState title="Result not found"
          action={<Button variant="secondary" onClick={() => navigate('/quiz')}>Back to Quizzes</Button>} />
      </div>
    )
  }

  const scored  = attempt.answers as Array<{ question_id: string; answer: string; correct: boolean }>
  const insights = buildPerformanceInsights(questions, scored.map((a) => ({
    ...a,
    correct_answer: questions.find((q) => q.id === a.question_id)?.correct_answer ?? '',
    explanation:    questions.find((q) => q.id === a.question_id)?.explanation ?? '',
  })))

  const { percentage, totalScore, totalCount } = insights

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <Link to="/quiz" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
        <ArrowLeft className="h-4 w-4" /> Back to Quizzes
      </Link>

      <h1 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">{quiz.title} — Results</h1>

      {/* Score overview */}
      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <ScoreRing pct={percentage} />
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalScore}</p>
                <p className="text-xs text-gray-500">Correct</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalCount - totalScore}</p>
                <p className="text-xs text-gray-500">Wrong</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{totalCount}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>

            {/* Performance insights */}
            {insights.bestTopic && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-900/20">
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-300">
                  Best at: <strong>{insights.bestTopic}</strong>
                </span>
              </div>
            )}
            {insights.worstTopic && insights.worstTopic !== insights.bestTopic && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm dark:bg-amber-900/20">
                <TrendingDown className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-700 dark:text-amber-300">
                  Needs work: <strong>{insights.worstTopic}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to={`/quiz/${quiz.id}/attempt`}>
          <Button variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />}>Retake quiz</Button>
        </Link>
        <Button variant="ghost" onClick={() => navigate('/quiz')}>
          Back to Quizzes
        </Button>
      </div>

      {/* Per-question review */}
      <div className="space-y-4">
        <h2 className="text-h3 font-semibold text-gray-900 dark:text-gray-100">Question review</h2>
        {questions.map((q, i) => {
          const ans      = scored.find((a) => a.question_id === q.id)
          const isCorrect = ans?.correct ?? false
          return (
            <Card key={q.id} padding="md" className={cn(
              'border-l-4',
              isCorrect ? 'border-l-emerald-500' : 'border-l-red-500',
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {isCorrect
                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    : <XCircle       className="mt-0.5 h-5 w-5 shrink-0 text-red-500"     />}
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      <span className="mr-2 text-xs text-gray-400">Q{i + 1}.</span>
                      {q.question}
                    </p>

                    {/* Student's answer */}
                    <div className={cn(
                      'rounded-md px-3 py-1.5 text-sm',
                      isCorrect
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300',
                    )}>
                      <span className="font-medium">Your answer: </span>
                      {ans?.answer || <em className="opacity-60">Not answered</em>}
                    </div>

                    {/* Correct answer (always shown) */}
                    {!isCorrect && (
                      <div className="rounded-md bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                        <span className="font-medium">Correct answer: </span>
                        {q.correct_answer}
                      </div>
                    )}

                    {/* Explanation */}
                    {q.explanation && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Explanation: </span>
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
                <Badge color={q.type === 'mcq' ? 'primary' : 'default'} size="sm" className="shrink-0">
                  {q.type.replace('_', ' ')}
                </Badge>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
