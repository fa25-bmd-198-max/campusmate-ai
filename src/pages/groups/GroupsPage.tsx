import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, Plus, Lock, Globe, Search } from 'lucide-react'
import { Badge, Button, Card, Input, Modal, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { usePublicGroups, useMyGroups, useCreateGroup, useJoinGroup } from '@/hooks/useGroups'
import { useCourses } from '@/hooks/useProfile'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { GroupWithMemberCount } from '@/types/group.types'

// ── Create group modal ────────────────────────────────────────
function CreateGroupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: courses = [] } = useCourses()
  const createGroup = useCreateGroup()
  const navigate    = useNavigate()

  const [name,       setName]       = useState('')
  const [description,setDescription]= useState('')
  const [subject,    setSubject]    = useState('')
  const [isPrivate,  setIsPrivate]  = useState(false)
  const [maxMembers, setMaxMembers] = useState(20)

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Group name is required'); return }
    try {
      const group = await createGroup.mutateAsync({ name: name.trim(), description, subject, isPrivate, maxMembers })
      toast.success('Study group created!')
      onClose()
      navigate(`/groups/${group.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create group')
    }
  }

  const handleClose = () => {
    if (createGroup.isPending) return
    setName(''); setDescription(''); setSubject(''); setIsPrivate(false); setMaxMembers(20)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create study group"
      persistent={createGroup.isPending}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={createGroup.isPending}>Cancel</Button>
          <Button onClick={handleCreate} loading={createGroup.isPending}
            leftIcon={<Plus className="h-4 w-4" />}>
            Create group
          </Button>
        </div>
      }>
      <div className="space-y-4">
        <Input label="Group name" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. CS 301 Study Squad" required />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What will this group study?"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
          <select value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
            <option value="">No subject</option>
            {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max members: <span className="text-primary-600 font-bold">{maxMembers}</span>
          </label>
          <input type="range" min={2} max={50} value={maxMembers}
            aria-label={`Maximum members: ${maxMembers}`}
            aria-valuemin={2} aria-valuemax={50} aria-valuenow={maxMembers}
            onChange={e => setMaxMembers(Number(e.target.value))}
            className="w-full accent-primary-600" />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Private group</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Only invited members can join</p>
          </div>
          <button role="switch" aria-checked={isPrivate} onClick={() => setIsPrivate(p => !p)}
            className={cn('relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors',
              isPrivate ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700')}>
            <span aria-hidden="true" className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
              isPrivate ? 'translate-x-5' : 'translate-x-0')} />
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Group card ────────────────────────────────────────────────
function GroupCard({ group, onJoin, joining }: {
  group:   GroupWithMemberCount
  onJoin:  (id: string) => void
  joining: boolean
}) {
  return (
    <Card padding="md" className="group transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/30">
          <Users className="h-5 w-5 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/groups/${group.id}`}
              className="truncate font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400">
              {group.name}
            </Link>
            {group.is_private
              ? <Badge color="default" size="sm"><Lock className="h-3 w-3 mr-1" />Private</Badge>
              : <Badge color="info"    size="sm"><Globe className="h-3 w-3 mr-1" />Public</Badge>}
            {group.subject && <Badge color="primary" size="sm">{group.subject}</Badge>}
          </div>
          {group.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
            {group.member_count}/{group.max_members} members · {formatRelativeTime(group.created_at)}
          </p>
        </div>
        <div className="shrink-0">
          {group.is_member ? (
            <Link to={`/groups/${group.id}`}>
              <Button variant="secondary" size="sm">Open</Button>
            </Link>
          ) : !group.is_private ? (
            <Button size="sm" onClick={() => onJoin(group.id)} loading={joining}>Join</Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────
type Tab = 'my' | 'discover'

export default function GroupsPage() {
  const { data: myGroups     = [], isLoading: myLoading  } = useMyGroups()
  const { data: publicGroups = [], isLoading: pubLoading } = usePublicGroups()
  const joinGroup = useJoinGroup()

  const [tab,          setTab]          = useState<Tab>('my')
  const [search,       setSearch]       = useState('')
  const [createOpen,   setCreateOpen]   = useState(false)

  // Debounce search (300ms) per TASK-4.5.3
  const debouncedSearch = useDebounce(search, 300)

  const handleJoin = async (groupId: string) => {
    try {
      await joinGroup.mutateAsync(groupId)
      toast.success('Joined group!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join group')
    }
  }

  const myIds = new Set(myGroups.map(g => g.id))
  const discover = publicGroups.filter(g => !myIds.has(g.id))

  const filterGroups = (gs: GroupWithMemberCount[]) =>
    debouncedSearch ? gs.filter(g => g.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (g.subject ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())) : gs

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Study Groups</h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            Collaborate with other students on shared subjects
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Create group
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900" role="tablist">
        {[
          { id: 'my' as Tab,       label: `My Groups (${myGroups.length})` },
          { id: 'discover' as Tab, label: 'Discover'                       },
        ].map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              tab === t.id ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
      </div>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* My Groups */}
      {tab === 'my' && (
        myLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton.Card key={i} />)}</div>
        ) : filterGroups(myGroups).length === 0 ? (
          <EmptyState icon={<Users className="h-7 w-7" />}
            title={debouncedSearch ? 'No groups match your search' : "You haven't joined any groups yet"}
            description={debouncedSearch ? 'Try a different term' : 'Create a group or discover public groups in the Discover tab'}
            action={!debouncedSearch ? <Button variant="secondary" onClick={() => setTab('discover')}>Discover groups</Button> : undefined} />
        ) : (
          <div className="space-y-3">
            {filterGroups(myGroups).map(g => (
              <GroupCard key={g.id} group={g} onJoin={handleJoin} joining={joinGroup.isPending} />
            ))}
          </div>
        )
      )}

      {/* Discover */}
      {tab === 'discover' && (
        pubLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton.Card key={i} />)}</div>
        ) : filterGroups(discover).length === 0 ? (
          <EmptyState icon={<Globe className="h-7 w-7" />}
            title={debouncedSearch ? 'No groups match' : 'No public groups yet'}
            description={debouncedSearch ? 'Try a different term' : 'Be the first to create a public study group!'} />
        ) : (
          <div className="space-y-3">
            {filterGroups(discover).map(g => (
              <GroupCard key={g.id} group={g} onJoin={handleJoin} joining={joinGroup.isPending} />
            ))}
          </div>
        )
      )}
    </div>
  )
}
