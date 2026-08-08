import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, Users, FileText, Layers, UsersRound } from 'lucide-react'
import { Avatar, Badge, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { supabase } from '@/services/supabase'

import { cn } from '@/utils/cn'

// ── Result types ──────────────────────────────────────────────
interface StudentResult {
  id:          string
  full_name:   string
  avatar_url:  string | null
  university:  string | null
  semester:    number | null
}

interface GroupResult {
  id:           string
  name:         string
  subject:      string | null
  member_count: number
  is_private:   boolean
}

interface NoteResult {
  id:        string
  title:     string
  subject:   string | null
  file_type: string | null
  status:    string
}

interface FlashcardSetResult {
  id:         string
  title:      string
  subject:    string | null
  card_count: number
}

interface SearchResults {
  students:     StudentResult[]
  groups:       GroupResult[]
  notes:        NoteResult[]
  flashcards:   FlashcardSetResult[]
}

// ── Search service ────────────────────────────────────────────
async function runSearch(query: string, userId: string): Promise<SearchResults> {
  const q = `%${query}%`

  const [students, groups, notes, flashcards] = await Promise.all([
    // Students: public profiles
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, university, semester')
      .eq('privacy_public', true)
      .neq('id', userId)
      .or(`full_name.ilike.${q},university.ilike.${q}`)
      .limit(8)
      .then(({ data }) => (data ?? []) as StudentResult[]),

    // Study groups: public ones
    supabase
      .from('study_groups')
      .select('id, name, subject, is_private')
      .eq('is_private', false)
      .or(`name.ilike.${q},subject.ilike.${q}`)
      .limit(6)
      .then(async ({ data }) => {
        if (!data?.length) return []
        const ids = data.map((g) => g.id)
        const { data: counts } = await supabase
          .from('group_members')
          .select('group_id')
          .in('group_id', ids)
        const countMap: Record<string, number> = {}
        ;(counts ?? []).forEach((c) => { countMap[c.group_id] = (countMap[c.group_id] ?? 0) + 1 })
        return data.map((g) => ({ ...g, member_count: countMap[g.id] ?? 0 })) as GroupResult[]
      }),

    // Notes: own notes only
    supabase
      .from('notes')
      .select('id, title, subject, file_type, status')
      .eq('user_id', userId)
      .or(`title.ilike.${q},subject.ilike.${q}`)
      .limit(6)
      .then(({ data }) => (data ?? []) as NoteResult[]),

    // Flashcard sets: own sets
    supabase
      .from('flashcard_sets')
      .select('id, title, subject, card_count')
      .eq('user_id', userId)
      .or(`title.ilike.${q},subject.ilike.${q}`)
      .limit(6)
      .then(({ data }) => (data ?? []) as FlashcardSetResult[]),
  ])

  return { students, groups, notes, flashcards }
}

// ── Section wrapper ───────────────────────────────────────────
function Section({
  icon, title, count, children,
}: {
  icon:     React.ReactNode
  title:    string
  count:    number
  children: React.ReactNode
}) {
  return (
    <section aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {title}
        </h2>
        <Badge color="default" size="sm">{count}</Badge>
      </div>
      {children}
    </section>
  )
}

// ── Result items ──────────────────────────────────────────────
function StudentItem({ s }: { s: StudentResult }) {
  return (
    <Link to={`/profile/${s.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Avatar src={s.avatar_url} name={s.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{s.full_name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {[s.university, s.semester ? `Sem ${s.semester}` : null].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  )
}

function GroupItem({ g }: { g: GroupResult }) {
  return (
    <Link to={`/groups/${g.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/30">
        <UsersRound className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{g.name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {g.subject && <span className="mr-1">{g.subject} · </span>}
          {g.member_count} member{g.member_count !== 1 ? 's' : ''}
        </p>
      </div>
    </Link>
  )
}

const FILE_COLOR: Record<string, string> = {
  pdf: 'text-red-500', docx: 'text-blue-500', pptx: 'text-orange-500', txt: 'text-gray-500',
}

function NoteItem({ n }: { n: NoteResult }) {
  return (
    <Link to={`/notes/${n.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <FileText className={cn('h-8 w-8 shrink-0', FILE_COLOR[n.file_type ?? 'txt'])} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{n.title}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {n.subject ?? 'No subject'} · {n.file_type?.toUpperCase() ?? 'TXT'}
        </p>
      </div>
      <Badge color={n.status === 'ready' ? 'success' : 'default'} size="sm">{n.status}</Badge>
    </Link>
  )
}

function FlashcardItem({ f }: { f: FlashcardSetResult }) {
  return (
    <Link to={`/flashcards/${f.id}/review`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
        <Layers className="h-5 w-5 text-primary-600 dark:text-primary-400" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{f.title}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {f.subject ?? 'No subject'} · {f.card_count} card{f.card_count !== 1 ? 's' : ''}
        </p>
      </div>
    </Link>
  )
}

// ── Skeleton list ─────────────────────────────────────────────
function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.Card key={i} />
      ))}
    </div>
  )
}

// ── Main SearchPage ───────────────────────────────────────────
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''

  const [query,    setQuery]    = useState(initialQ)
  const [results,  setResults]  = useState<SearchResults | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [searched, setSearched] = useState(initialQ.trim().length > 0)

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Run search on mount if there's an initial query
  useEffect(() => {
    if (initialQ.trim().length > 0) {
      performSearch(initialQ)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const performSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) { setResults(null); setSearched(false); return }

    // Get current user for private-content queries
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)
    setSearched(true)

    try {
      const res = await runSearch(trimmed, user.id)
      setResults(res)
    } catch {
      setResults({ students: [], groups: [], notes: [], flashcards: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (value: string) => {
    setQuery(value)
    // Update URL param
    if (value.trim()) {
      setSearchParams({ q: value }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
    // 300ms debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    performSearch(query)
  }

  const totalResults = results
    ? results.students.length + results.groups.length + results.notes.length + results.flashcards.length
    : 0

  const hasAny = results && totalResults > 0

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Search</h1>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
          Find students, groups, notes, and flashcard sets
        </p>
      </div>

      {/* Search bar — 4.2.4: reads ?q param, updates on change */}
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor="main-search" className="sr-only">Search</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400 dark:text-gray-500">
            <Search className="h-5 w-5" aria-hidden="true" />
          </span>
          <input
            id="main-search"
            type="search"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search students, groups, notes, flashcards…"
            autoFocus
            className={cn(
              'w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-12 pr-4 text-base',
              'text-gray-900 placeholder:text-gray-400 shadow-sm',
              'focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500',
            )}
          />
        </div>
      </form>

      {/* Results count */}
      {searched && !loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {hasAny
            ? `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query.trim()}"`
            : `No results for "${query.trim()}"`}
        </p>
      )}

      {/* Loading state — show skeletons per category */}
      {loading && (
        <div className="space-y-8">
          {['Students', 'Groups', 'Notes', 'Flashcards'].map((s) => (
            <div key={s}>
              <div className="mb-3 flex items-center gap-2">
                <Skeleton.Line className="h-4 w-24" />
              </div>
              <SkeletonList count={2} />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-8">
          {/* Students */}
          {results.students.length > 0 && (
            <Section icon={<Users className="h-4 w-4" />} title="Students" count={results.students.length}>
              <div className="grid gap-2 sm:grid-cols-2">
                {results.students.map((s) => <StudentItem key={s.id} s={s} />)}
              </div>
            </Section>
          )}

          {/* Groups */}
          {results.groups.length > 0 && (
            <Section icon={<UsersRound className="h-4 w-4" />} title="Study Groups" count={results.groups.length}>
              <div className="grid gap-2 sm:grid-cols-2">
                {results.groups.map((g) => <GroupItem key={g.id} g={g} />)}
              </div>
            </Section>
          )}

          {/* Notes */}
          {results.notes.length > 0 && (
            <Section icon={<FileText className="h-4 w-4" />} title="Notes" count={results.notes.length}>
              <div className="space-y-2">
                {results.notes.map((n) => <NoteItem key={n.id} n={n} />)}
              </div>
            </Section>
          )}

          {/* Flashcard sets */}
          {results.flashcards.length > 0 && (
            <Section icon={<Layers className="h-4 w-4" />} title="Flashcard Sets" count={results.flashcards.length}>
              <div className="grid gap-2 sm:grid-cols-2">
                {results.flashcards.map((f) => <FlashcardItem key={f.id} f={f} />)}
              </div>
            </Section>
          )}

          {/* All-empty state */}
          {!hasAny && searched && (
            <EmptyState
              icon={<Search className="h-7 w-7" />}
              title="No results found"
              description={`Nothing matched "${query.trim()}". Try a different search term.`}
            />
          )}
        </div>
      )}

      {/* Pre-search idle state */}
      {!searched && !loading && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <Search className="h-8 w-8 text-gray-400 dark:text-gray-600" />
          </span>
          <div className="max-w-xs space-y-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Start searching</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Search across students, study groups, your notes, and flashcard sets
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
