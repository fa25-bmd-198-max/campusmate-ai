import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, FileText, ClipboardCheck, Layers,
  UsersRound, Activity, Search, Shield,
  CheckCircle, XCircle, ShieldOff, ShieldCheck,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui'
import { supabase } from '@/services/supabase'
import { cn } from '@/utils/cn'
import { formatDate, formatRelativeTime } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { ProfileRow, ReportRow, ContentType, ReportStatus } from '@/types/database.types'

// ── Query keys ────────────────────────────────────────────────
const adminKeys = {
  stats:   () => ['admin', 'stats']           as const,
  users:   () => ['admin', 'users']           as const,
  reports: (status: string) => ['admin', 'reports', status] as const,
}

// ── Types ─────────────────────────────────────────────────────
interface PlatformStats {
  total_users:          number
  monthly_active_users: number
  total_uploads:        number
  total_quizzes:        number
  total_flashcard_sets: number
  total_groups:         number
}

interface AdminUserRow extends ProfileRow {
  email: string | null
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <Card padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
          {icon}
        </span>
      </div>
    </Card>
  )
}

// ── Tab: Overview ─────────────────────────────────────────────
function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async (): Promise<PlatformStats> => {
      // Fetch all counts in parallel
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [users, mau, uploads, quizzes, fsets, groups] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('study_logs').select('user_id', { count: 'exact', head: true })
          .gte('logged_at', thirtyDaysAgo.toISOString().slice(0, 10)),
        supabase.from('notes').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('flashcard_sets').select('id', { count: 'exact', head: true }),
        supabase.from('study_groups').select('id', { count: 'exact', head: true }),
      ])

      return {
        total_users:          users.count          ?? 0,
        monthly_active_users: mau.count            ?? 0,
        total_uploads:        uploads.count        ?? 0,
        total_quizzes:        quizzes.count        ?? 0,
        total_flashcard_sets: fsets.count          ?? 0,
        total_groups:         groups.count         ?? 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const STATS = [
    { label: 'Total Users',          icon: <Users         className="h-5 w-5 text-primary-500"  />, value: data?.total_users          ?? 0, color: 'bg-primary-100 dark:bg-primary-900/30'   },
    { label: 'Monthly Active',       icon: <Activity      className="h-5 w-5 text-emerald-500"  />, value: data?.monthly_active_users  ?? 0, color: 'bg-emerald-100 dark:bg-emerald-900/30'  },
    { label: 'Total Uploads',        icon: <FileText      className="h-5 w-5 text-blue-500"     />, value: data?.total_uploads         ?? 0, color: 'bg-blue-100 dark:bg-blue-900/30'        },
    { label: 'Total Quizzes',        icon: <ClipboardCheck className="h-5 w-5 text-orange-500" />, value: data?.total_quizzes         ?? 0, color: 'bg-orange-100 dark:bg-orange-900/30'    },
    { label: 'Flashcard Sets',       icon: <Layers        className="h-5 w-5 text-purple-500"   />, value: data?.total_flashcard_sets  ?? 0, color: 'bg-purple-100 dark:bg-purple-900/30'   },
    { label: 'Study Groups',         icon: <UsersRound    className="h-5 w-5 text-secondary-500"/>, value: data?.total_groups          ?? 0, color: 'bg-secondary-100 dark:bg-secondary-900/30'},
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3,4,5,6].map(i => <Skeleton.Block key={i} className="h-24" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATS.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600">
        Stats refresh every 5 minutes. Monthly Active Users based on study log activity in the last 30 days.
      </p>
    </div>
  )
}

// ── Tab: Users ────────────────────────────────────────────────
function UsersTab() {
  const queryClient = useQueryClient()
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(0)
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: 'deactivate' | 'activate' | 'promote' } | null>(null)

  const PAGE_SIZE = 20

  const { data: users = [], isLoading } = useQuery({
    queryKey: adminKeys.users(),
    queryFn: async (): Promise<AdminUserRow[]> => {
      // Get profiles + auth emails via profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      return (data ?? []).map(p => ({ ...p, email: null })) as AdminUserRow[]
    },
    staleTime: 60_000,
  })

  const toggleActive = useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase.from('profiles').update({ is_active: active }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: (_, { active }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
      toast.success(active ? 'Account reactivated' : 'Account deactivated')
      setConfirmAction(null)
    },
    onError: () => toast.error('Action failed'),
  })

  const promoteToAdmin = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from('profiles').update({ is_admin: true }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
      toast.success('User promoted to admin')
      setConfirmAction(null)
    },
    onError: () => toast.error('Promotion failed'),
  })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u =>
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.university?.toLowerCase().includes(q)
    )
  }, [users, search])

  const paged    = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPgs = Math.ceil(filtered.length / PAGE_SIZE)

  const handleConfirm = () => {
    if (!confirmAction) return
    if (confirmAction.action === 'promote') {
      promoteToAdmin.mutate(confirmAction.userId)
    } else {
      toggleActive.mutate({ userId: confirmAction.userId, active: confirmAction.action === 'activate' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-gray-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
          placeholder="Search by name or university…"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton.Card key={i} />)}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full text-sm" aria-label="Platform users">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  {['User', 'University', 'Joined', 'Status', 'Role', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paged.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
                ) : paged.map(user => (
                  <tr key={user.id} className="bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                          {user.full_name || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">
                      {user.university || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={user.is_active ? 'success' : 'error'} size="sm" dot>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin
                        ? <Badge color="primary" size="sm"><Shield className="h-3 w-3 mr-1" />Admin</Badge>
                        : <Badge color="default" size="sm">Student</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setConfirmAction({ userId: user.id, action: user.is_active ? 'deactivate' : 'activate' })}
                          aria-label={user.is_active ? 'Deactivate account' : 'Reactivate account'}
                          title={user.is_active ? 'Deactivate' : 'Reactivate'}
                          className={cn('rounded-md p-1.5 transition-colors',
                            user.is_active
                              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          )}>
                          {user.is_active ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </button>
                        {!user.is_admin && (
                          <button
                            onClick={() => setConfirmAction({ userId: user.id, action: 'promote' })}
                            aria-label="Promote to admin"
                            title="Promote to admin"
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20">
                            <Shield className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPgs > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {filtered.length} users · page {page + 1} of {totalPgs}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPgs - 1, p + 1))} disabled={page === totalPgs - 1}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation modal */}
      {confirmAction && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setConfirmAction(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm action"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-modal dark:bg-gray-900"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-h3 font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {confirmAction.action === 'promote' ? 'Promote to admin?' :
               confirmAction.action === 'deactivate' ? 'Deactivate account?' : 'Reactivate account?'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {confirmAction.action === 'promote' ? 'This gives the user full admin access to the platform.' :
               confirmAction.action === 'deactivate' ? 'The user will be unable to log in until reactivated.' :
               'The user will regain access to their account.'}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
              <Button
                variant={confirmAction.action === 'deactivate' ? 'danger' : 'primary'}
                onClick={handleConfirm}
                loading={toggleActive.isPending || promoteToAdmin.isPending}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Reports ───────────────────────────────────────────────
const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  note:    'Note',
  group:   'Group',
  profile: 'Profile',
  message: 'Message',
}

const REPORT_STATUS_COLOR: Record<ReportStatus, 'error' | 'success' | 'default'> = {
  open:      'error',
  resolved:  'success',
  dismissed: 'default',
}

function ReportsTab() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'open' | 'all'>('open')

  const { data: reports = [], isLoading } = useQuery({
    queryKey: adminKeys.reports(filter),
    queryFn: async (): Promise<ReportRow[]> => {
      let q = supabase.from('reports').select('*').order('created_at', { ascending: false })
      if (filter === 'open') q = q.eq('status', 'open')
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ReportRow[]
    },
  })

  const updateReport = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReportStatus }) => {
      const { error } = await supabase.from('reports').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.reports(filter) })
      toast.success(status === 'dismissed' ? 'Report dismissed' : 'Report resolved')
    },
    onError: () => toast.error('Action failed'),
  })

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {(['open', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400')}>
            {f === 'open' ? 'Open reports' : 'All reports'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton.Card key={i} />)}</div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-400" />
          <p className="font-medium text-gray-700 dark:text-gray-300">No {filter === 'open' ? 'open ' : ''}reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => (
            <Card key={report.id} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color={REPORT_STATUS_COLOR[report.status]} size="sm" dot>{report.status}</Badge>
                    <Badge color="default" size="sm">{CONTENT_TYPE_LABELS[report.content_type]}</Badge>
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      {formatRelativeTime(report.created_at)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Content ID: <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">{report.content_id}</code>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Reason: </span>{report.reason}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-600">
                    Reporter ID: {report.reporter_id}
                  </p>
                </div>
                {report.status === 'open' && (
                  <div className="flex shrink-0 gap-2">
                    <Button variant="secondary" size="sm"
                      onClick={() => updateReport.mutate({ id: report.id, status: 'dismissed' })}
                      loading={updateReport.isPending}
                      leftIcon={<XCircle className="h-3.5 w-3.5" />}>
                      Dismiss
                    </Button>
                    <Button variant="danger" size="sm"
                      onClick={() => updateReport.mutate({ id: report.id, status: 'resolved' })}
                      loading={updateReport.isPending}
                      leftIcon={<CheckCircle className="h-3.5 w-3.5" />}>
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab navigation ────────────────────────────────────────────
type AdminTab = 'overview' | 'users' | 'reports'
const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity      className="h-4 w-4" /> },
  { id: 'users',    label: 'Users',    icon: <Users         className="h-4 w-4" /> },
  { id: 'reports',  label: 'Reports',  icon: <Shield        className="h-4 w-4" /> },
]

// ── Main page ─────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <Shield className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </span>
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Platform management and moderation</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900" role="tablist">
        {TABS.map(tab => (
          <button key={tab.id} role="tab" aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              activeTab === tab.id
                ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200')}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'users'    && <UsersTab    />}
      {activeTab === 'reports'  && <ReportsTab  />}
    </div>
  )
}
