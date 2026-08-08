import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Bot, FileText, BookOpen, Hash, FlaskConical,
  ClipboardList, Target, Tag, RefreshCw,
} from 'lucide-react'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import ReportButton from '@/components/shared/ReportButton'
import ChatDrawer from '@/components/assistant/ChatDrawer'
import { useNote, useUpdateNoteSubject } from '@/hooks/useNotes'
import { useCourses } from '@/hooks/useProfile'
import { cn } from '@/utils/cn'
import { formatFileSize } from '@/utils/fileParser'
import { formatDate } from '@/utils/formatters'
import type { ChatContext } from '@/types/ai.types'
import toast from 'react-hot-toast'

// ── Tab definition ────────────────────────────────────────────
const TABS = [
  { id: 'summary',       label: 'Summary',       icon: <BookOpen      className="h-4 w-4" /> },
  { id: 'key_concepts',  label: 'Key Concepts',  icon: <Hash          className="h-4 w-4" /> },
  { id: 'definitions',   label: 'Definitions',   icon: <ClipboardList className="h-4 w-4" /> },
  { id: 'formulas',      label: 'Formulas',       icon: <FlaskConical  className="h-4 w-4" /> },
  { id: 'revision',      label: 'Revision Notes',icon: <FileText      className="h-4 w-4" /> },
  { id: 'exam_topics',   label: 'Exam Topics',   icon: <Target        className="h-4 w-4" /> },
] as const

type TabId = (typeof TABS)[number]['id']

const FILE_TYPE_COLOR: Record<string, string> = {
  pdf: 'text-red-500', docx: 'text-blue-500', pptx: 'text-orange-500', txt: 'text-gray-500',
}

// ── Helpers ───────────────────────────────────────────────────
function EmptyTabState({ label }: { label: string }) {
  return (
    <EmptyState
      title={`No ${label.toLowerCase()} available`}
      description="The AI did not find any in this document, or the summary is still processing."
      className="py-10"
    />
  )
}

// ── Subject tag selector ──────────────────────────────────────
function SubjectTag({
  noteId, currentSubject, courses,
}: {
  noteId: string; currentSubject: string | null; courses: { id: string; name: string }[]
}) {
  const [editing,    setEditing]    = useState(false)
  const [selected,   setSelected]   = useState(currentSubject ?? '')
  const updateSubject = useUpdateNoteSubject()

  const save = async () => {
    await updateSubject.mutateAsync({ noteId, subject: selected || null })
    toast.success('Subject updated')
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          autoFocus
          className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">No subject</option>
          {courses.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <Button size="sm" variant="secondary" onClick={save} loading={updateSubject.isPending}>Save</Button>
        <Button size="sm" variant="ghost"    onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs text-gray-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-gray-700 dark:hover:border-primary-600"
      aria-label="Edit subject tag"
    >
      <Tag className="h-3 w-3" aria-hidden="true" />
      {currentSubject ?? 'Add subject'}
    </button>
  )
}

// ── Tab content renderers ─────────────────────────────────────
function SummaryTab({ summary }: { summary: string | null }) {
  if (!summary) return <EmptyTabState label="Summary" />
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      {summary.split('\n').filter(Boolean).map((para, i) => (
        <p key={i} className="text-body text-gray-700 dark:text-gray-300 leading-relaxed">
          {para}
        </p>
      ))}
    </div>
  )
}

function KeyConceptsTab({ concepts }: { concepts: string[] }) {
  if (!concepts?.length) return <EmptyTabState label="Key Concepts" />
  return (
    <div className="flex flex-wrap gap-2">
      {concepts.map((concept) => (
        <span
          key={concept}
          className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
        >
          {concept}
        </span>
      ))}
    </div>
  )
}

function DefinitionsTab({ definitions }: { definitions: Array<{ term: string; definition: string }> }) {
  if (!definitions?.length) return <EmptyTabState label="Definitions" />
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {definitions.map(({ term, definition }) => (
        <div key={term} className="py-3">
          <dt className="font-semibold text-gray-900 dark:text-gray-100">{term}</dt>
          <dd className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{definition}</dd>
        </div>
      ))}
    </div>
  )
}

function FormulasTab({ formulas }: { formulas: string[] }) {
  if (!formulas?.length) return <EmptyTabState label="Formulas" />
  return (
    <div className="space-y-3">
      {formulas.map((formula, i) => (
        <pre
          key={i}
          className="overflow-x-auto rounded-lg bg-gray-100 p-4 font-mono text-sm text-gray-800 dark:bg-gray-800 dark:text-gray-200"
        >
          {formula}
        </pre>
      ))}
    </div>
  )
}

function RevisionNotesTab({ revisionNotes }: { revisionNotes: string | null }) {
  if (!revisionNotes) return <EmptyTabState label="Revision Notes" />
  const lines = revisionNotes.split('\n').filter(Boolean)
  return (
    <ul className="space-y-2" role="list">
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" aria-hidden="true" />
          {line.replace(/^[•·\-*]\s*/, '')}
        </li>
      ))}
    </ul>
  )
}

function ExamTopicsTab({ topics }: { topics: string[] }) {
  if (!topics?.length) return <EmptyTabState label="Exam Topics" />
  return (
    <ul className="space-y-2" role="list">
      {topics.map((topic, i) => (
        <li key={i} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <Target className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
          {topic}
        </li>
      ))}
    </ul>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function NoteDetailPage() {
  const { noteId }     = useParams<{ noteId: string }>()
  const navigate       = useNavigate()
  const { data: note, isLoading } = useNote(noteId)
  const { data: courses = [] }    = useCourses()

  const [activeTab,    setActiveTab]    = useState<TabId>('summary')
  const [chatOpen,     setChatOpen]     = useState(false)

  // Build context for the AI assistant drawer
  const chatContext: ChatContext | undefined = note ? {
    noteTitle:   note.title,
    noteContent: note.summary ?? note.revision_notes ?? '',
  } : undefined

  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton.Line className="h-8 w-64" />
        <Skeleton.Block className="h-12" />
        <Skeleton.Block className="h-64" />
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────
  if (!note) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="Note not found"
          description="This note may have been deleted."
          action={<Button variant="secondary" onClick={() => navigate('/notes')}>Back to Notes</Button>}
        />
      </div>
    )
  }

  // ── Processing / error states ─────────────────────────────
  if (note.status === 'processing') {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Link to="/notes" className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> Back to Notes
        </Link>
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <RefreshCw className="h-10 w-10 animate-spin text-primary-600" aria-hidden="true" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">AI is analysing your notes…</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This usually takes 10–20 seconds. You can leave this page and come back.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/notes')}>
            Back to library
          </Button>
        </Card>
      </div>
    )
  }

  if (note.status === 'error') {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Link to="/notes" className="mb-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
          <ArrowLeft className="h-4 w-4" /> Back to Notes
        </Link>
        <EmptyState
          icon={<FileText className="h-8 w-8 text-red-400" />}
          title="AI summarisation failed"
          description="Something went wrong while processing this note. Delete it and try uploading again."
          action={<Button variant="secondary" onClick={() => navigate('/notes')}>Back to Notes</Button>}
        />
      </div>
    )
  }

  // ── Ready — full view ─────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Back + header */}
      <div>
        <Link
          to="/notes"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Notes
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">{note.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className={cn('flex items-center gap-1', FILE_TYPE_COLOR[note.file_type ?? 'txt'])}>
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                {note.file_type?.toUpperCase()}
              </span>
              {note.file_size && <span>{formatFileSize(note.file_size)}</span>}
              <span>{formatDate(note.created_at)}</span>
              <Badge color="success" size="sm" dot>AI summary ready</Badge>
            </div>
            <div className="mt-2">
              <SubjectTag noteId={note.id} currentSubject={note.subject} courses={courses} />
            </div>
          </div>

          {/* Ask AI button */}
          <Button
            variant="secondary"
            leftIcon={<Bot className="h-4 w-4" />}
            onClick={() => setChatOpen(true)}
          >
            Ask AI about this note
          </Button>
          <ReportButton contentType="note" contentId={note.id} />
        </div>
      </div>

      {/* Tab navigation */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900"
        role="tablist"
        aria-label="Note sections"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              activeTab === tab.id
                ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <Card id={`panel-${activeTab}`} role="tabpanel" aria-label={TABS.find(t => t.id === activeTab)?.label}>
        {activeTab === 'summary'      && <SummaryTab       summary={note.summary} />}
        {activeTab === 'key_concepts' && <KeyConceptsTab   concepts={note.key_concepts} />}
        {activeTab === 'definitions'  && <DefinitionsTab   definitions={note.definitions} />}
        {activeTab === 'formulas'     && <FormulasTab      formulas={note.formulas} />}
        {activeTab === 'revision'     && <RevisionNotesTab revisionNotes={note.revision_notes} />}
        {activeTab === 'exam_topics'  && <ExamTopicsTab    topics={note.exam_topics} />}
      </Card>

      {/* AI chat drawer — pre-loaded with note context */}
      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        context={chatContext}
      />
    </div>
  )
}
