import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, Plus, Trash2, Search,
  Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'
import { Badge, Button, Card, Modal, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useQuizzes, useDeleteQuiz, useGenerateQuiz } from '@/hooks/useQuiz'
import { useNotes } from '@/hooks/useNotes'
import { useDebounce } from '@/hooks/useDebounce'
import { useVirtualList } from '@/hooks/useVirtualList'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { QuizQuestionType } from '@/types/quiz.types'

// ── Quiz list card (extracted for virtualisation) ─────────────
import type { QuizRow } from '@/types/quiz.types'

function QuizCard({ quiz, onDelete }: { quiz: QuizRow; onDelete: () => void }) {
  return (
    <Card padding="md" className="group transition-shadow hover:shadow-md">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <ClipboardCheck className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-gray-900 dark:text-gray-100">{quiz.title}</span>
            {quiz.subject && <Badge color="primary" size="sm">{quiz.subject}</Badge>}
            <Badge color="default" size="sm">{quiz.question_count ?? '?'} questions</Badge>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatRelativeTime(quiz.created_at)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link to={`/quiz/${quiz.id}/attempt`}>
            <Button variant="secondary" size="sm">Take quiz</Button>
          </Link>
          <button onClick={onDelete} aria-label={`Delete ${quiz.title}`}
            className="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  )
}

// ── Question-type selector ────────────────────────────────────
const QUESTION_TYPES: { value: QuizQuestionType; label: string }[] = [
  { value: 'mcq',          label: 'Multiple Choice' },
  { value: 'true_false',   label: 'True / False'    },
  { value: 'fill_blank',   label: 'Fill in the Blank' },
  { value: 'short_answer', label: 'Short Answer'    },
]

// ── Generate modal ────────────────────────────────────────────
function GenerateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: notes = [], isLoading: notesLoading } = useNotes()
  const { generate, generating, genError, resetError } = useGenerateQuiz()
  const navigate = useNavigate()

  const readyNotes = notes.filter((n) => n.status === 'ready')

  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [count,          setCount]          = useState(10)
  const [selectedTypes,  setSelectedTypes]  = useState<QuizQuestionType[]>(['mcq', 'true_false'])

  const toggleType = (type: QuizQuestionType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter((t) => t !== type) : prev  // keep at least one
        : [...prev, type],
    )
  }

  const selectedNote = readyNotes.find((n) => n.id === selectedNoteId)

  const handleGenerate = async () => {
    if (!selectedNote) return
    const quiz = await generate({
      noteId:        selectedNote.id,
      noteTitle:     selectedNote.title,
      questionCount: count,
      types:         selectedTypes,
      subject:       selectedNote.subject,
    })
    if (quiz) {
      toast.success(`${quiz.question_count} questions generated!`)
      onClose()
      navigate(`/quiz/${quiz.id}/attempt`)
    }
  }

  const handleClose = () => {
    if (generating) return
    resetError()
    setSelectedNoteId('')
    setCount(10)
    setSelectedTypes(['mcq', 'true_false'])
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate quiz"
      description="AI will create questions from your note's content"
      persistent={generating}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={generating}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!selectedNoteId || generating}
            leftIcon={<ClipboardCheck className="h-4 w-4" />}
          >
            {generating ? 'Generating…' : 'Generate quiz'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Note selector */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Source note <span className="text-red-500">*</span>
          </label>
          {notesLoading ? (
            <Skeleton.Line className="h-10" />
          ) : readyNotes.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              No ready notes found. Upload and summarise a note first.
            </p>
          ) : (
            <select
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              disabled={generating}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Select a note…</option>
              {readyNotes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}{n.subject ? ` (${n.subject})` : ''}</option>
              ))}
            </select>
          )}
        </div>

        {/* Question count */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Number of questions:{' '}
            <span className="font-bold text-primary-600 dark:text-primary-400">{count}</span>
          </label>
          <input type="range" min={5} max={30} step={5} value={count}
            aria-label={`Number of questions: ${count}`}
            aria-valuemin={5} aria-valuemax={30} aria-valuenow={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={generating} className="w-full accent-primary-600" />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>5</span><span>15</span><span>30</span>
          </div>
        </div>

        {/* Question types */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Question types <span className="font-normal text-gray-400">(select at least one)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {QUESTION_TYPES.map((t) => {
              const active = selectedTypes.includes(t.value)
              return (
                <button key={t.value} type="button" onClick={() => toggleType(t.value)}
                  disabled={generating}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400',
                  )}>
                  {active
                    ? <CheckCircle2 className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    : <span className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Generating */}
        {generating && (
          <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <div>
              <p className="font-medium">AI is creating your quiz…</p>
              <p className="text-xs opacity-75">This usually takes 10–20 seconds</p>
            </div>
          </div>
        )}

        {/* Error */}
        {genError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-medium">Generation failed</p><p className="mt-0.5 text-xs">{genError}</p></div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function QuizPage() {
  const { data: quizzes = [], isLoading } = useQuizzes()
  const deleteQuiz                         = useDeleteQuiz()

  const [search,       setSearch]       = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [confirmId,    setConfirmId]    = useState<string | null>(null)

  // Debounce search input (300ms) per TASK-4.5.3
  const debouncedSearch = useDebounce(search, 300)

  const filtered = debouncedSearch
    ? quizzes.filter((q) =>
        q.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (q.subject ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : quizzes

  // Virtualised list for large quiz histories (>50 items) per TASK-4.5.4
  const ITEM_H = 72  // px — approximate card height
  const { containerRef, virtualState, isVirtual } = useVirtualList(
    { total: filtered.length, itemHeight: ITEM_H },
  )

  const handleDelete = async () => {
    if (!confirmId) return
    const q = quizzes.find((q) => q.id === confirmId)
    await deleteQuiz.mutateAsync(confirmId)
    setConfirmId(null)
    toast.success(`"${q?.title}" deleted`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Quizzes</h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            AI-generated quizzes to test your understanding
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Generate quiz
        </Button>
      </div>

      {/* Search */}
      {quizzes.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quizzes…"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </div>
      )}

      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton.Card key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-7 w-7" />}
          title={debouncedSearch ? 'No quizzes match your search' : 'No quizzes yet'}
          description={debouncedSearch ? 'Try a different search term' : 'Generate your first quiz from a lecture note to test yourself'}
          action={!debouncedSearch ? (
            <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setGenerateOpen(true)}>
              Generate quiz
            </Button>
          ) : undefined}
        />
      ) : (
        // Virtualised container — only renders visible slice when >50 items
        <div
          ref={containerRef}
          className="space-y-3"
          style={isVirtual ? { overflowY: 'auto', maxHeight: '600px', position: 'relative' } : undefined}
        >
          {isVirtual && (
            <div style={{ height: virtualState.totalHeight, position: 'relative' }}>
              <div style={{ transform: `translateY(${virtualState.offsetTop}px)`, position: 'absolute', width: '100%' }}>
                <div className="space-y-3">
                  {filtered.slice(virtualState.startIndex, virtualState.endIndex + 1).map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} onDelete={() => setConfirmId(quiz.id)} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {!isVirtual && filtered.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onDelete={() => setConfirmId(quiz.id)} />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <Modal open={!!confirmId} onClose={() => setConfirmId(null)} title="Delete quiz?"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleteQuiz.isPending}>Delete</Button>
          </div>
        }>
        <p className="text-body text-gray-600 dark:text-gray-400">
          This quiz and all its questions will be permanently deleted. Past attempt records will also be removed.
        </p>
      </Modal>
    </div>
  )
}
