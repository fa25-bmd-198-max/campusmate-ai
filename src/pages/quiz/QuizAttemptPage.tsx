import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { Badge, Button, Card, Skeleton, Modal } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useQuiz, useQuizQuestions, useSaveAttempt } from '@/hooks/useQuiz'
import { scoreAttempt } from '@/services/quizService'
import { cn } from '@/utils/cn'
import type { QuizQuestionRow } from '@/types/quiz.types'

// ── Renders a single question based on its type ───────────────
function QuestionInput({
  question,
  value,
  onChange,
  submitted,
}: {
  question:  QuizQuestionRow
  value:     string
  onChange:  (v: string) => void
  submitted: boolean
}) {
  if (question.type === 'mcq' && question.options) {
    return (
      <fieldset>
        <legend className="sr-only">Choose an answer</legend>
        <div className="space-y-3">
          {question.options.map((opt, i) => {
            const letter = ['A','B','C','D'][i] ?? String(i + 1)
            const selected = value === opt
            return (
              <label
                key={opt}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors',
                  submitted ? 'cursor-not-allowed' : 'cursor-pointer',
                  selected && !submitted
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                )}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt}
                  checked={selected}
                  onChange={() => onChange(opt)}
                  disabled={submitted}
                  className="mt-0.5 accent-primary-600"
                />
                <span className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                  <span className="shrink-0 font-semibold text-gray-400">{letter}.</span>
                  {opt}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }

  if (question.type === 'true_false') {
    return (
      <div className="flex gap-3">
        {['True', 'False'].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            disabled={submitted}
            className={cn(
              'flex-1 rounded-xl border px-5 py-3 text-sm font-medium transition-colors',
              value === opt
                ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300',
              submitted && 'cursor-not-allowed opacity-70',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    )
  }

  if (question.type === 'fill_blank') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer…"
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 disabled:opacity-70"
      />
    )
  }

  // short_answer
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={submitted}
      placeholder="Write your answer…"
      rows={4}
      className="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 disabled:opacity-70"
    />
  )
}

// ── Main attempt page ─────────────────────────────────────────
export default function QuizAttemptPage() {
  const { quizId }   = useParams<{ quizId: string }>()
  const navigate     = useNavigate()

  const { data: quiz,      isLoading: quizLoading      } = useQuiz(quizId)
  const { data: questions = [], isLoading: qLoading    } = useQuizQuestions(quizId)
  const saveAttempt = useSaveAttempt()

  const [answers,   setAnswers]   = useState<Record<string, string>>({})
  const [currentIdx,setCurrentIdx]= useState(0)
  const [viewMode,  setViewMode]  = useState<'one' | 'all'>('one')
  const [submitted, setSubmitted] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const currentQuestion = questions[currentIdx] as QuizQuestionRow | undefined
  const answered  = Object.values(answers).filter((v) => v.trim() !== '').length
  const unanswered = questions.length - answered

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }, [])

  const handleSubmit = async () => {
    setConfirmSubmit(false)
    setSubmitted(true)
    const scored = scoreAttempt(questions, answers)
    const attempt = await saveAttempt.mutateAsync({ quizId: quizId!, answers: scored })
    if (attempt) navigate(`/quiz/${attempt.id}/result`)
  }

  if (quizLoading || qLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Skeleton.Line className="h-8 w-64" />
        <Skeleton.Block className="h-48" />
        <Skeleton.Line className="h-12" />
      </div>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<AlertCircle className="h-8 w-8" />}
          title="Quiz not found"
          action={<Button variant="secondary" onClick={() => navigate('/quiz')}>Back to Quizzes</Button>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/quiz" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Badge color="default" size="sm">{answered}/{questions.length} answered</Badge>
          <button
            onClick={() => setViewMode(viewMode === 'one' ? 'all' : 'one')}
            className="text-xs text-primary-600 underline underline-offset-2 hover:text-primary-500 dark:text-primary-400"
          >
            {viewMode === 'one' ? 'Show all' : 'Show one at a time'}
          </button>
        </div>
      </div>

      <h1 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">{quiz.title}</h1>

      {/* Progress */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-primary-600 transition-all"
          style={{ width: `${(answered / questions.length) * 100}%` }}
        />
      </div>

      {/* Questions */}
      {viewMode === 'all' ? (
        // All-at-once mode
        <div className="space-y-6">
          {questions.map((q, i) => (
            <Card key={q.id} padding="lg">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Question {i + 1}
                </span>
                <Badge color={q.type === 'mcq' ? 'primary' : 'default'} size="sm">
                  {q.type.replace('_', ' ')}
                </Badge>
              </div>
              <p className="mb-4 text-base font-medium text-gray-900 dark:text-gray-100">{q.question}</p>
              <QuestionInput
                question={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswer(q.id, v)}
                submitted={submitted}
              />
            </Card>
          ))}

          <Button
            fullWidth
            size="lg"
            onClick={() => setConfirmSubmit(true)}
            loading={saveAttempt.isPending}
            disabled={submitted}
          >
            Submit quiz
          </Button>
        </div>
      ) : (
        // One-at-a-time mode
        currentQuestion && (
          <div className="space-y-4">
            {/* Question nav dots */}
            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={cn(
                    'h-7 w-7 rounded-full text-xs font-medium transition-colors',
                    i === currentIdx
                      ? 'bg-primary-600 text-white'
                      : answers[q.id]?.trim()
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <Card padding="lg">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <Badge color={currentQuestion.type === 'mcq' ? 'primary' : 'default'} size="sm">
                  {currentQuestion.type.replace('_', ' ')}
                </Badge>
              </div>
              <p className="mb-5 text-base font-medium text-gray-900 dark:text-gray-100">
                {currentQuestion.question}
              </p>
              <QuestionInput
                question={currentQuestion}
                value={answers[currentQuestion.id] ?? ''}
                onChange={(v) => setAnswer(currentQuestion.id, v)}
                submitted={submitted}
              />
            </Card>

            {/* Prev / Next / Submit */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm"
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Previous
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button variant="ghost" size="sm"
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={() => setConfirmSubmit(true)}
                  loading={saveAttempt.isPending}
                  disabled={submitted}
                >
                  Submit quiz
                </Button>
              )}
            </div>
          </div>
        )
      )}

      {/* Submit confirmation */}
      <Modal
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title={unanswered > 0 ? `Submit with ${unanswered} unanswered?` : 'Submit quiz?'}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>Keep reviewing</Button>
            <Button onClick={handleSubmit} loading={saveAttempt.isPending}>Submit now</Button>
          </div>
        }
      >
        <p className="text-body text-gray-600 dark:text-gray-400">
          {unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Unanswered questions will be marked incorrect.`
            : 'Once submitted you cannot change your answers.'}
        </p>
      </Modal>
    </div>
  )
}
