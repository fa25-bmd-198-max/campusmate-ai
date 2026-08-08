import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MessageCircle, Users, Calendar, FileText,
  BarChart3, Send, Zap, LogOut, Loader2,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Skeleton, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import ReportButton from '@/components/shared/ReportButton'
import {
  useGroup, useGroupMembers, useGroupMessages, useSendMessage,
  useLeaveGroup,
} from '@/hooks/useGroups'
import { useAuthContext } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import { getAIScheduleSuggestion, getAIMemberRecommendations, updateGroupNotes } from '@/services/groupService'
import { cn } from '@/utils/cn'
import { formatRelativeTime, formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { MessageWithProfile, MemberWithProfile } from '@/types/group.types'

type Tab = 'chat' | 'members' | 'schedule' | 'notes' | 'progress'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'chat',     label: 'Chat',          icon: <MessageCircle className="h-4 w-4" /> },
  { id: 'members',  label: 'Members',       icon: <Users         className="h-4 w-4" /> },
  { id: 'schedule', label: 'Schedule',      icon: <Calendar      className="h-4 w-4" /> },
  { id: 'notes',    label: 'Shared Notes',  icon: <FileText      className="h-4 w-4" /> },
  { id: 'progress', label: 'Progress',      icon: <BarChart3     className="h-4 w-4" /> },
]

// ── Chat tab ──────────────────────────────────────────────────
function ChatTab({ groupId }: { groupId: string }) {
  const { user }   = useAuthContext()
  const { data: initialMessages = [], isLoading, refetch } = useGroupMessages(groupId)
  const sendMsg    = useSendMessage(groupId)
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [input,    setInput]    = useState('')
  const bottomRef  = useRef<HTMLDivElement>(null)

  // Seed from query, then keep live via Realtime
  useEffect(() => { setMessages(initialMessages) }, [initialMessages])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async () => {
        // Re-fetch to get joined profile data
        refetch()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [groupId, refetch])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || sendMsg.isPending) return
    const text = input.trim()
    setInput('')
    try {
      await sendMsg.mutateAsync(text)
    } catch { toast.error('Message could not be sent') }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div className="flex flex-col" style={{ height: '520px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 py-2">
        {messages.length === 0 ? (
          <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="No messages yet"
            description="Be the first to say something!" className="py-8" />
        ) : messages.map(msg => {
          const isMe = msg.user_id === user?.id
          return (
            <div key={msg.id} className={cn('flex items-end gap-2', isMe && 'flex-row-reverse')}>
              <Avatar src={msg.profile?.avatar_url} name={msg.profile?.full_name ?? ''} size="sm" />
              <div className={cn('max-w-[72%] space-y-1', isMe && 'items-end flex flex-col')}>
                {!isMe && (
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {msg.profile?.full_name ?? 'Member'}
                  </p>
                )}
                <div className={cn('rounded-2xl px-4 py-2.5 text-sm',
                  isMe ? 'rounded-br-sm bg-primary-600 text-white' : 'rounded-bl-sm bg-white shadow-sm ring-1 ring-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700')}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-gray-400">{formatRelativeTime(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Type a message…"
          className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        <button onClick={handleSend} disabled={!input.trim() || sendMsg.isPending}
          aria-label="Send message"
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all',
            input.trim() && !sendMsg.isPending ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700')}>
          {sendMsg.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

// ── Members tab ───────────────────────────────────────────────
function MembersTab({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const { data: members = [], isLoading } = useGroupMembers(groupId)
  const { user }  = useAuthContext()
  const [aiRec,    setAiRec]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [group]    = useState<{ subject: string | null }>({ subject: null })

  const fetchAIRec = async () => {
    setLoading(true)
    try {
      const rec = await getAIMemberRecommendations(groupId, group.subject, members)
      setAiRec(rec)
    } catch { toast.error('AI recommendation failed') }
    finally { setLoading(false) }
  }

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
          <Button size="sm" variant="secondary" onClick={fetchAIRec} loading={loading}
            leftIcon={<Zap className="h-3.5 w-3.5" />}>
            AI: Find members
          </Button>
        </div>
      )}

      {aiRec && (
        <Card muted padding="sm">
          <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 mb-1">AI Recommendation</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiRec}</p>
        </Card>
      )}

      <ul className="space-y-2" role="list">
        {members.map(member => (
          <li key={member.user_id} className="flex items-center gap-3">
            <Avatar src={member.profile?.avatar_url} name={member.profile?.full_name ?? ''} size="sm" />
            <div className="min-w-0 flex-1">
              <Link to={`/profile/${member.user_id}`}
                className="text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400">
                {member.profile?.full_name ?? 'Member'}
                {member.user_id === user?.id && <span className="ml-1 text-xs text-gray-400">(you)</span>}
              </Link>
              <p className="text-xs text-gray-500">{member.profile?.university ?? ''}</p>
            </div>
            <Badge color={member.role === 'admin' ? 'primary' : 'default'} size="sm">
              {member.role}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Schedule tab ──────────────────────────────────────────────
function ScheduleTab({ groupId }: { groupId: string }) {
  const { data: members = [] } = useGroupMembers(groupId)
  const [suggestion, setSuggestion] = useState('')
  const [loading,    setLoading]    = useState(false)

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const s = await getAIScheduleSuggestion(groupId, members)
      setSuggestion(s)
    } catch { toast.error('Could not generate schedule') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Group study schedule</h3>
        <Button size="sm" variant="secondary" onClick={fetchSchedule} loading={loading}
          leftIcon={<Zap className="h-3.5 w-3.5" />}>
          AI: Suggest schedule
        </Button>
      </div>

      {suggestion ? (
        <Card muted>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400 mb-2">
            AI Suggested Schedule
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {suggestion}
          </p>
        </Card>
      ) : (
        <EmptyState icon={<Calendar className="h-6 w-6" />}
          title="No schedule yet"
          description="Use the AI button to generate a suggested schedule based on member availability"
          className="py-8" />
      )}
    </div>
  )
}

// ── Shared Notes tab ──────────────────────────────────────────
function NotesTab({ group }: { group: { id: string; description: string | null; admin_id: string | null } }) {
  const [notes,    setNotes]   = useState(group.description ?? '')
  const [saving,   setSaving]  = useState(false)
  const [lastSaved,setLastSaved]= useState<Date | null>(null)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateGroupNotes(group.id, notes)
      setLastSaved(new Date())
      toast.success('Notes saved')
    } catch { toast.error('Could not save notes') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Shared notes visible to all members
          {lastSaved && ` · Last saved ${formatRelativeTime(lastSaved.toISOString())}`}
        </p>
        <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={14}
        placeholder="Add shared notes for the group here…"
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 resize-y"
      />
    </div>
  )
}

// ── Progress tab ──────────────────────────────────────────────
function ProgressTab({ members }: { members: MemberWithProfile[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Member study activity (self-reported from personal study logs)
      </p>
      <ul className="space-y-2" role="list">
        {members.map(m => (
          <li key={m.user_id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <Avatar src={m.profile?.avatar_url} name={m.profile?.full_name ?? ''} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {m.profile?.full_name ?? 'Member'}
              </p>
              <p className="text-xs text-gray-500">
                Joined {formatDate(m.joined_at)} · {m.role}
              </p>
            </div>
            <Badge color={m.role === 'admin' ? 'primary' : 'default'} size="sm">{m.role}</Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Main detail page ──────────────────────────────────────────
export default function GroupDetailPage() {
  const { groupId }  = useParams<{ groupId: string }>()
  const navigate     = useNavigate()
  const { user }     = useAuthContext()
  const [activeTab,  setActiveTab]  = useState<Tab>('chat')

  const { data: group,   isLoading: gLoading } = useGroup(groupId)
  const { data: members = [], isLoading: mLoading } = useGroupMembers(groupId)
  const leaveGroup = useLeaveGroup()

  const isAdmin    = group?.admin_id === user?.id
  const isMember   = members.some(m => m.user_id === user?.id)

  const handleLeave = async () => {
    if (!groupId) return
    if (isAdmin) { toast.error('Transfer admin role before leaving.'); return }
    await leaveGroup.mutateAsync(groupId)
    toast.success('Left group')
    navigate('/groups')
  }

  if (gLoading || mLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Skeleton.Line className="h-8 w-64" />
        <Skeleton.Block className="h-12" />
        <Skeleton.Block className="h-96" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="p-6">
        <EmptyState title="Group not found"
          action={<Button variant="secondary" onClick={() => navigate('/groups')}>Back to Groups</Button>} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/groups" className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <ArrowLeft className="h-4 w-4" /> All groups
          </Link>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">{group.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {group.subject && <Badge color="primary">{group.subject}</Badge>}
            {group.is_private
              ? <Badge color="default">Private</Badge>
              : <Badge color="info">Public</Badge>}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {members.length}/{group.max_members} members
            </span>
          </div>
        </div>
        {isMember && !isAdmin && (
          <div className="flex items-center gap-2">
            <ReportButton contentType="group" contentId={group.id} />
            <Button variant="secondary" size="sm" onClick={handleLeave} loading={leaveGroup.isPending}
              leftIcon={<LogOut className="h-4 w-4" />}>
              Leave
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900" role="tablist">
        {TABS.map(tab => (
          <button key={tab.id} role="tab" aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              activeTab === tab.id ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400')}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <Card padding="lg">
        {activeTab === 'chat'     && <ChatTab groupId={group.id} />}
        {activeTab === 'members'  && <MembersTab groupId={group.id} isAdmin={isAdmin} />}
        {activeTab === 'schedule' && <ScheduleTab groupId={group.id} />}
        {activeTab === 'notes'    && <NotesTab group={group} />}
        {activeTab === 'progress' && <ProgressTab members={members} />}
      </Card>
    </div>
  )
}
