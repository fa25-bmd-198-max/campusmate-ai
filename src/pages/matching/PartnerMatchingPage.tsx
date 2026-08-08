import { useState } from 'react'
import {
  Users, Zap, CheckCircle, Clock, XCircle,
  RefreshCw, BookOpen, Calendar, GraduationCap,
  UserCheck, UserPlus,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { Link } from 'react-router-dom'
import {
  useAIMatches, useConnectionStatusMap, useConnections,
  useSendConnectionRequest, useRespondToRequest, useCancelConnection,
} from '@/hooks/useMatching'
import { useProfile } from '@/hooks/useProfile'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { PartnerMatch, ConnectionWithProfile } from '@/types/matching.types'

// ── Score ring (smaller than quiz result, inline) ─────────────
function ScoreRing({ score }: { score: number }) {
  const r    = 18
  const circ = 2 * Math.PI * r
  const off  = circ - (score / 100) * circ
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#6366f1'

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" className="dark:stroke-gray-700" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={off}
          strokeLinecap="round" />
      </svg>
      <span className="absolute text-[10px] font-bold text-gray-700 dark:text-gray-300">
        {score}%
      </span>
    </div>
  )
}

// ── Connection action button ──────────────────────────────────
function ConnectButton({
  userId,
  statusMap,
  onConnect,
  onCancel,
  loading,
}: {
  userId:    string
  statusMap: Record<string, { status: string; id: string; isSender: boolean }>
  onConnect: (id: string) => void
  onCancel:  (connId: string) => void
  loading:   boolean
}) {
  const conn = statusMap[userId]

  if (!conn) {
    return (
      <Button size="sm" onClick={() => onConnect(userId)} loading={loading}
        leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
        Connect
      </Button>
    )
  }

  if (conn.status === 'pending' && conn.isSender) {
    return (
      <Button size="sm" variant="secondary" onClick={() => onCancel(conn.id)}
        leftIcon={<Clock className="h-3.5 w-3.5 text-amber-500" />}>
        Pending
      </Button>
    )
  }

  if (conn.status === 'pending' && !conn.isSender) {
    return (
      <Badge color="info" size="md" dot>Wants to connect</Badge>
    )
  }

  if (conn.status === 'accepted') {
    return (
      <Badge color="success" size="md">
        <UserCheck className="h-3.5 w-3.5 mr-1" /> Connected
      </Badge>
    )
  }

  return (
    <Button size="sm" onClick={() => onConnect(userId)} loading={loading}
      leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
      Connect
    </Button>
  )
}

// ── Partner match card ────────────────────────────────────────
function PartnerMatchCard({
  match,
  statusMap,
  onConnect,
  onCancel,
  connectLoading,
}: {
  match:          PartnerMatch
  statusMap:      Record<string, { status: string; id: string; isSender: boolean }>
  onConnect:      (id: string) => void
  onCancel:       (connId: string) => void
  connectLoading: boolean
}) {
  const { profile } = match
  const [expanded, setExpanded] = useState(false)

  return (
    <Card padding="md" className="transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Score ring */}
        <ScoreRing score={match.score} />

        {/* Avatar + info */}
        <Link
          to={`/profile/${profile.id}`}
          className="flex min-w-0 flex-1 items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
          aria-label={`View ${profile.full_name}'s profile`}
        >
          <Avatar src={profile.avatar_url} name={profile.full_name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
              {profile.full_name || 'Student'}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {[profile.degree, profile.university].filter(Boolean).join(' · ')}
            </p>
            {profile.semester && (
              <Badge color="default" size="sm" className="mt-1">Sem {profile.semester}</Badge>
            )}
          </div>
        </Link>

        {/* Connect action */}
        <div className="shrink-0">
          <ConnectButton
            userId={profile.id}
            statusMap={statusMap}
            onConnect={onConnect}
            onCancel={onCancel}
            loading={connectLoading}
          />
        </div>
      </div>

      {/* Match explanation */}
      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {match.explanation}
      </p>

      {/* Expandable details */}
      {(match.shared_courses.length > 0 || match.shared_availability.length > 0) && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            {expanded ? 'Hide details' : 'Show shared details'}
          </button>

          {expanded && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {match.shared_courses.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    <BookOpen className="h-3.5 w-3.5" /> Shared courses
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.shared_courses.map((c) => (
                      <Badge key={c} color="primary" size="sm">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {match.shared_availability.length > 0 && (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    <Calendar className="h-3.5 w-3.5" /> Shared availability
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.shared_availability.map((a) => (
                      <Badge key={a} color="default" size="sm">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Connection card (My Connections tab) ──────────────────────
function ConnectionCard({
  conn,
  onRespond,
  onCancel,
  responding,
  cancelling,
}: {
  conn:       ConnectionWithProfile
  onRespond:  (id: string, status: 'accepted' | 'declined') => void
  onCancel:   (id: string) => void
  responding: boolean
  cancelling: boolean
}) {
  const profile = conn.otherProfile

  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <Link to={profile ? `/profile/${profile.id}` : '#'}>
          <Avatar src={profile?.avatar_url} name={profile?.full_name ?? ''} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            to={profile ? `/profile/${profile.id}` : '#'}
            className="block truncate font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100 dark:hover:text-primary-400"
          >
            {profile?.full_name || 'Unknown student'}
          </Link>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {[profile?.degree, profile?.university].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Status / actions */}
        <div className="shrink-0 flex items-center gap-2">
          {conn.status === 'accepted' && (
            <Badge color="success" size="md" dot>Connected</Badge>
          )}

          {conn.status === 'pending' && conn.isSender && (
            <>
              <Badge color="warning" size="md" dot>Pending</Badge>
              <Button size="sm" variant="ghost" onClick={() => onCancel(conn.id)}
                loading={cancelling}
                leftIcon={<XCircle className="h-3.5 w-3.5 text-red-500" />}>
                Cancel
              </Button>
            </>
          )}

          {conn.status === 'pending' && !conn.isSender && (
            <>
              <Button size="sm" variant="secondary"
                onClick={() => onRespond(conn.id, 'declined')}
                loading={responding}>
                Decline
              </Button>
              <Button size="sm"
                onClick={() => onRespond(conn.id, 'accepted')}
                loading={responding}
                leftIcon={<CheckCircle className="h-3.5 w-3.5" />}>
                Accept
              </Button>
            </>
          )}

          {conn.status === 'declined' && (
            <Badge color="error" size="md">Declined</Badge>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-600">
        {conn.isSender ? 'You sent a request' : 'Sent you a request'} · {formatRelativeTime(conn.created_at)}
      </p>
    </Card>
  )
}

// ── Insufficient users empty state ────────────────────────────
function InsufficientUsersState() {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-16 text-center dark:border-gray-700 dark:bg-gray-900/50">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
        <GraduationCap className="h-8 w-8 text-primary-600 dark:text-primary-400" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-2">
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-gray-100">
          Not enough matches yet
        </h3>
        <p className="text-body text-gray-500 dark:text-gray-400">
          As more students join CampusMate AI and complete their profiles, better matches will appear here.
        </p>
      </div>
      <div className="rounded-xl border border-primary-200 bg-primary-50 px-5 py-4 text-sm text-primary-800 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300 max-w-xs space-y-2">
        <p className="font-medium">Improve your match quality:</p>
        <ul className="space-y-1 text-left list-none">
          {['Complete your profile', 'Add your enrolled courses', 'Set your weekly availability', 'List your skills and interests'].map((tip) => (
            <li key={tip} className="flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              {tip}
            </li>
          ))}
        </ul>
        <Link to="/settings">
          <Button size="sm" className="mt-2 w-full">Complete profile</Button>
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
type Tab = 'find' | 'connections'

export default function PartnerMatchingPage() {
  const { profile } = useProfile()
  const [activeTab,    setActiveTab]    = useState<Tab>('find')
  const [matchEnabled, setMatchEnabled] = useState(false)

  const {
    data:      matches = [],
    isLoading: matchLoading,
    error:     matchError,
    refetch:   refetchMatches,
    isFetching,
  } = useAIMatches(matchEnabled)

  const { data: connections = [],   isLoading: connLoading  } = useConnections()
  const { data: statusMap = {} } = useConnectionStatusMap()

  const sendRequest  = useSendConnectionRequest()
  const respond      = useRespondToRequest()
  const cancel       = useCancelConnection()

  const handleConnect = async (receiverId: string) => {
    try {
      await sendRequest.mutateAsync(receiverId)
      toast.success('Connection request sent!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send request.')
    }
  }

  const handleRespond = async (connectionId: string, status: 'accepted' | 'declined') => {
    await respond.mutateAsync({ connectionId, status })
    toast.success(status === 'accepted' ? 'Connection accepted!' : 'Request declined')
  }

  const handleCancel = async (connectionId: string) => {
    await cancel.mutateAsync(connectionId)
    toast.success('Connection request cancelled')
  }

  const pendingIncoming = connections.filter((c) => c.status === 'pending' && !c.isSender).length

  const triggerMatch = () => {
    setMatchEnabled(true)
    if (matchEnabled) refetchMatches()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Study Partners</h1>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
          AI finds compatible study partners based on your courses, schedule, and learning style
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900"
        role="tablist">
        {([
          { id: 'find',        label: 'Find Partners', icon: <Users className="h-4 w-4" /> },
          { id: 'connections', label: `My Connections${pendingIncoming > 0 ? ` (${pendingIncoming})` : ''}`, icon: <UserCheck className="h-4 w-4" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button key={tab.id} role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              activeTab === tab.id
                ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            )}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Find Partners tab ─────────────────────────────────── */}
      {activeTab === 'find' && (
        <div className="space-y-4">
          {!matchEnabled ? (
            // Pre-search CTA
            <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 py-12 text-center dark:border-primary-800 dark:bg-primary-900/10">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                <Zap className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              </span>
              <div className="max-w-xs space-y-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Find your ideal study partner</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI will analyse {profile?.full_name?.split(' ')[0] ?? 'your'}'s profile and recommend compatible students
                </p>
              </div>
              <Button
                onClick={triggerMatch}
                leftIcon={<Zap className="h-4 w-4" />}
              >
                Find study partners
              </Button>
            </div>
          ) : matchLoading || isFetching ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse text-center">
                AI is finding compatible study partners…
              </p>
              {[1, 2, 3].map((i) => <Skeleton.Card key={i} />)}
            </div>
          ) : matchError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
              <p className="font-medium text-red-700 dark:text-red-400">Could not load matches</p>
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {matchError instanceof Error ? matchError.message : 'An error occurred.'}
              </p>
              <Button variant="secondary" size="sm" className="mt-4"
                onClick={() => refetchMatches()}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                Try again
              </Button>
            </div>
          ) : matches.length === 0 ? (
            <InsufficientUsersState />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {matches.length} compatible partner{matches.length !== 1 ? 's' : ''} found
                </p>
                <Button variant="ghost" size="sm"
                  onClick={() => refetchMatches()}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                  Refresh
                </Button>
              </div>
              {matches.map((match) => (
                <PartnerMatchCard
                  key={match.user_id}
                  match={match}
                  statusMap={statusMap}
                  onConnect={handleConnect}
                  onCancel={handleCancel}
                  connectLoading={sendRequest.isPending || cancel.isPending}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* ── My Connections tab ────────────────────────────────── */}
      {activeTab === 'connections' && (
        <div className="space-y-4">
          {connLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton.Card key={i} />)}</div>
          ) : connections.length === 0 ? (
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title="No connections yet"
              description="Use the Find Partners tab to discover and connect with compatible study partners"
              action={<Button variant="secondary" onClick={() => setActiveTab('find')}>Find partners</Button>}
            />
          ) : (
            <>
              {/* Pending requests section */}
              {connections.filter((c) => c.status === 'pending' && !c.isSender).length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Pending requests
                  </h2>
                  <div className="space-y-3">
                    {connections
                      .filter((c) => c.status === 'pending' && !c.isSender)
                      .map((conn) => (
                        <ConnectionCard key={conn.id} conn={conn}
                          onRespond={handleRespond}
                          onCancel={handleCancel}
                          responding={respond.isPending}
                          cancelling={cancel.isPending} />
                      ))}
                  </div>
                </div>
              )}

              {/* All connections */}
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  All connections
                </h2>
                <div className="space-y-3">
                  {connections.map((conn) => (
                    <ConnectionCard key={conn.id} conn={conn}
                      onRespond={handleRespond}
                      onCancel={handleCancel}
                      responding={respond.isPending}
                      cancelling={cancel.isPending} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
