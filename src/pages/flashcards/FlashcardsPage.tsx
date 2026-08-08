import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Layers, Plus, Trash2, Search,  Loader2, AlertCircle,
} from 'lucide-react'
import { Badge, Button, Card, Modal, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useFlashcardSets, useDeleteFlashcardSet, useGenerateFlashcards } from '@/hooks/useFlashcards'
import { useNotes } from '@/hooks/useNotes'
import { useDebounce } from '@/hooks/useDebounce'
import { formatRelativeTime, pluralize } from '@/utils/formatters'
import toast from 'react-hot-toast'

// ── Generate modal ────────────────────────────────────────────
function GenerateModal({
  open, onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data: notes = [], isLoading: notesLoading } = useNotes()
  const { generate, generating, genError, resetError } = useGenerateFlashcards()
  const navigate = useNavigate()

  const readyNotes = notes.filter((n) => n.status === 'ready')

  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [count,          setCount]          = useState(20)

  const selectedNote = readyNotes.find((n) => n.id === selectedNoteId)

  const handleGenerate = async () => {
    if (!selectedNote) return
    const set = await generate({
      noteId:    selectedNote.id,
      noteTitle: selectedNote.title,
      count,
      subject:   selectedNote.subject,
    })
    if (set) {
      toast.success(`${set.card_count} flashcards created!`)
      onClose()
      navigate(`/flashcards/${set.id}/review`)
    }
  }

  const handleClose = () => {
    if (generating) return
    resetError()
    setSelectedNoteId('')
    setCount(20)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate flashcards"
      description="AI will create flashcards from your note's summary and key concepts"
      persistent={generating}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={generating}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={!selectedNoteId || generating}
            leftIcon={<Layers className="h-4 w-4" />}
          >
            {generating ? 'Generating…' : 'Generate flashcards'}
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
            <Skeleton.Line className="h-10 w-full" />
          ) : readyNotes.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              No ready notes found. Upload and summarise a note first.
            </div>
          ) : (
            <select
              value={selectedNoteId}
              onChange={(e) => setSelectedNoteId(e.target.value)}
              disabled={generating}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            >
              <option value="">Select a note…</option>
              {readyNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}{n.subject ? ` (${n.subject})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Count slider */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Number of cards:{' '}
            <span className="font-bold text-primary-600 dark:text-primary-400">{count}</span>
          </label>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={count}
            aria-label={`Number of cards: ${count}`}
            aria-valuemin={10}
            aria-valuemax={50}
            aria-valuenow={count}
            onChange={(e) => setCount(Number(e.target.value))}
            disabled={generating}
            className="w-full accent-primary-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>10</span><span>30</span><span>50</span>
          </div>
        </div>

        {/* Generating indicator */}
        {generating && (
          <div className="flex items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <div>
              <p className="font-medium">AI is creating your flashcards…</p>
              <p className="text-xs opacity-75">This usually takes 10–20 seconds</p>
            </div>
          </div>
        )}

        {/* Error */}
        {genError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Generation failed</p>
              <p className="mt-0.5 text-xs">{genError}</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function FlashcardsPage() {
  const { data: sets = [], isLoading } = useFlashcardSets()
  const deleteSet                       = useDeleteFlashcardSet()

  const [search,       setSearch]       = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [confirmId,    setConfirmId]    = useState<string | null>(null)

  // Debounce search (300ms) per TASK-4.5.3
  const debouncedSearch = useDebounce(search, 300)

  // Real-time search filter — matches title, subject, or topic
  const filtered = useMemo(() => {
    if (!debouncedSearch) return sets
    const q = debouncedSearch.toLowerCase()
    return sets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.subject ?? '').toLowerCase().includes(q),
    )
  }, [sets, debouncedSearch])

  const handleDelete = async () => {
    if (!confirmId) return
    const set = sets.find((s) => s.id === confirmId)
    await deleteSet.mutateAsync(confirmId)
    setConfirmId(null)
    toast.success(`"${set?.title}" deleted`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Flashcards</h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            AI-generated flashcard sets for active recall practice
          </p>
        </div>
        <Button
          onClick={() => setGenerateOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Generate new set
        </Button>
      </div>

      {/* Search */}
      {sets.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sets…"
            aria-label="Search flashcard sets"
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      {/* Generate modal */}
      <GenerateModal open={generateOpen} onClose={() => setGenerateOpen(false)} />

      {/* Sets list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton.Card key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-7 w-7" />}
          title={search ? 'No sets match your search' : 'No flashcard sets yet'}
          description={
            search
              ? 'Try a different search term'
              : 'Generate your first set from a lecture note to start practising'
          }
          action={
            !search ? (
              <Button
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setGenerateOpen(true)}
              >
                Generate flashcards
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((set) => {
            const total      = set.card_count

            return (
              <Card
                key={set.id}
                padding="md"
                className="group flex flex-col justify-between transition-shadow hover:shadow-md"
              >
                {/* Top */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/30">
                      <Layers className="h-5 w-5 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />
                    </span>
                    <button
                      onClick={() => setConfirmId(set.id)}
                      aria-label={`Delete ${set.title}`}
                      className="ml-auto rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <h3 className="mt-3 line-clamp-2 font-semibold text-gray-900 dark:text-gray-100">
                    {set.title}
                  </h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {set.subject && (
                      <Badge color="primary" size="sm">{set.subject}</Badge>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {pluralize(total, 'card')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      {formatRelativeTime(set.created_at)}
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-4 flex gap-2">
                  <Link to={`/flashcards/${set.id}/review`} className="flex-1">
                    <Button variant="primary" size="sm" fullWidth>
                      Review
                    </Button>
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Modal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        title="Delete flashcard set?"
        description="All cards in this set will be permanently deleted. This cannot be undone."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteSet.isPending}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-gray-600 dark:text-gray-400">
          This will remove the set and all {sets.find((s) => s.id === confirmId)?.card_count ?? 0} cards permanently.
        </p>
      </Modal>
    </div>
  )
}
