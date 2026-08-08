import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Upload, FileText, Search, Trash2,
  CheckCircle, AlertCircle, Clock, Loader2,
} from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { Badge, Button, Card, Input, Modal, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useNotes, useDeleteNote, useUploadNote } from '@/hooks/useNotes'
import { useCourses } from '@/hooks/useProfile'
import { cn } from '@/utils/cn'
import { formatFileSize, detectFileType } from '@/utils/fileParser'
import { formatRelativeTime } from '@/utils/formatters'
import toast from 'react-hot-toast'

// ── Status badge mapping ──────────────────────────────────────
const STATUS_CONFIG = {
  pending:    { color: 'default'    as const, icon: <Clock   className="h-3 w-3" />, label: 'Pending'    },
  processing: { color: 'warning'   as const, icon: <Loader2 className="h-3 w-3 animate-spin" />, label: 'Processing' },
  ready:      { color: 'success'   as const, icon: <CheckCircle className="h-3 w-3" />, label: 'Ready'   },
  error:      { color: 'error'     as const, icon: <AlertCircle className="h-3 w-3" />, label: 'Error'   },
}

const FILE_TYPE_COLOR: Record<string, string> = {
  pdf:  'text-red-500',
  docx: 'text-blue-500',
  pptx: 'text-orange-500',
  txt:  'text-gray-500',
}

// ── Stage label for upload progress ──────────────────────────
const STAGE_LABELS: Record<string, string> = {
  validating:  'Validating file…',
  uploading:   'Uploading…',
  extracting:  'Extracting text…',
  summarising: 'Generating AI summary…',
  saving:      'Saving results…',
  done:        'Complete!',
  error:       'Upload failed.',
}

// ── Drag-and-drop upload zone ─────────────────────────────────
function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFile(file)
      e.target.value = ''
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-label="Upload lecture notes — click or drag and drop"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        dragging
          ? 'border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
          : 'border-gray-300 bg-white hover:border-primary-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-700',
      )}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
        <Upload className="h-7 w-7 text-primary-600 dark:text-primary-400" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold text-gray-800 dark:text-gray-200">
          {dragging ? 'Drop your file here' : 'Upload lecture notes'}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          PDF, DOCX, PPTX or TXT · Max 20 MB
        </p>
        <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-600">
          Drag &amp; drop, or click to browse
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.txt"
        className="hidden"
        onChange={handleChange}
        aria-hidden="true"
      />
    </div>
  )
}

// ── Upload modal ──────────────────────────────────────────────
interface UploadModalProps {
  file:     File | null
  onClose:  () => void
  courses:  { id: string; name: string }[]
}

function UploadModal({ file, onClose, courses }: UploadModalProps) {
  const { upload, uploadState, reset } = useUploadNote()
  const [title,   setTitle]   = useState(file ? file.name.replace(/\.[^.]+$/, '') : '')
  const [subject, setSubject] = useState('')

  const isRunning = uploadState.stage !== 'idle' && uploadState.stage !== 'done' && uploadState.stage !== 'error'
  const isDone    = uploadState.stage === 'done'
  const isError   = uploadState.stage === 'error'

  const handleUpload = async () => {
    if (!file || !title.trim()) return
    const note = await upload({ file, title: title.trim(), subject: subject || null })
    if (note) {
      toast.success('Notes uploaded and summarised!')
      reset()
      onClose()
    }
  }

  const handleClose = () => {
    if (isRunning) return  // block close mid-upload
    reset()
    onClose()
  }

  return (
    <Modal
      open={!!file}
      onClose={handleClose}
      title="Upload lecture notes"
      persistent={isRunning}
      footer={
        !isDone && (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={isRunning}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              loading={isRunning}
              disabled={!title.trim() || isRunning}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              {isRunning ? STAGE_LABELS[uploadState.stage] ?? 'Processing…' : 'Upload & Summarise'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4">
        {/* File info */}
        {file && (
          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
            <FileText className={cn('h-8 w-8 shrink-0', FILE_TYPE_COLOR[detectFileType(file) ?? 'txt'])} aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{file.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
            </div>
          </div>
        )}

        <Input
          label="Note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Week 5 — Data Structures"
          disabled={isRunning}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isRunning}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">No subject</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin text-primary-600" aria-hidden="true" />
              {STAGE_LABELS[uploadState.stage] ?? 'Processing…'}
            </div>
            {uploadState.stage === 'uploading' && uploadState.progress > 0 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            AI summary generated successfully!
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-medium">Upload failed</p>
            <p className="mt-0.5">{uploadState.error}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function NotesPage() {
  const { data: notes = [], isLoading } = useNotes()
  const { data: courses = [] }          = useCourses()
  const deleteNote                       = useDeleteNote()

  const [pendingFile,  setPendingFile]  = useState<File | null>(null)
  const [search,       setSearch]       = useState('')
  const [filterSubject,setFilterSubject]= useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Debounce filter inputs (300ms) per TASK-4.5.3
  const debouncedSearch  = useDebounce(search, 300)
  const debouncedSubject = useDebounce(filterSubject, 300)

  // Filter notes by search and subject
  const filtered = notes.filter((n) => {
    const matchSearch  = !debouncedSearch  || n.title.toLowerCase().includes(debouncedSearch.toLowerCase())  || n.subject?.toLowerCase().includes(debouncedSearch.toLowerCase())
    const matchSubject = !debouncedSubject || n.subject === debouncedSubject
    return matchSearch && matchSubject
  })

  // Unique subjects for filter dropdown
  const subjects = [...new Set(notes.map((n) => n.subject).filter(Boolean))] as string[]

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return
    const note = notes.find((n) => n.id === confirmDeleteId)
    await deleteNote.mutateAsync({ noteId: confirmDeleteId, filePath: null })
    setConfirmDeleteId(null)
    toast.success(`"${note?.title}" deleted`)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Lecture Notes</h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            Upload your notes and let AI summarise them for you
          </p>
        </div>
        <Badge color="default">{notes.length} note{notes.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Upload zone */}
      <UploadZone onFile={setPendingFile} />

      {/* Upload modal */}
      <UploadModal
        file={pendingFile}
        onClose={() => setPendingFile(null)}
        courses={courses}
      />

      {/* Search & filter bar */}
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute inset-y-0 left-3 flex h-full w-4 items-center text-gray-400" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
          {subjects.length > 0 && (
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              aria-label="Filter by subject"
            >
              <option value="">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton.Card key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title={search || filterSubject ? 'No notes match your search' : 'No notes yet'}
          description={search || filterSubject ? 'Try adjusting your filters' : 'Upload your first lecture notes above to get started'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => {
            const cfg = STATUS_CONFIG[note.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
            return (
              <Card
                key={note.id}
                padding="md"
                className="group transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  {/* File type icon */}
                  <span className={cn('shrink-0 text-3xl', FILE_TYPE_COLOR[note.file_type ?? 'txt'])}>
                    <FileText className="h-8 w-8" aria-hidden="true" />
                  </span>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {note.status === 'ready' ? (
                        <Link
                          to={`/notes/${note.id}`}
                          className="truncate font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
                        >
                          {note.title}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
                          {note.title}
                        </span>
                      )}
                      <Badge color={cfg.color} size="sm" className="inline-flex items-center gap-1">
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {note.subject && <span className="mr-2 font-medium text-gray-700 dark:text-gray-300">{note.subject}</span>}
                      {note.file_type?.toUpperCase()}
                      {note.file_size ? ` · ${formatFileSize(note.file_size)}` : ''}
                      {` · ${formatRelativeTime(note.created_at)}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {note.status === 'error' && (
                      <Badge color="error" size="sm" dot>Failed — click to retry</Badge>
                    )}
                    {note.status === 'ready' && (
                      <Link to={`/notes/${note.id}`}>
                        <Button variant="secondary" size="sm">View summary</Button>
                      </Link>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(note.id)}
                      aria-label={`Delete ${note.title}`}
                      className="rounded-md p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete note?"
        description="This will permanently delete the note and its AI summary. This cannot be undone."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              loading={deleteNote.isPending}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-body text-gray-600 dark:text-gray-400">
          Any flashcard sets or quizzes generated from this note will no longer be linked to it,
          but will not be deleted.
        </p>
      </Modal>
    </div>
  )
}
