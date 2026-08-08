import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Hammer, Plus, Users, Calendar, Code2, Zap,
  ChevronRight, UserPlus, CheckCircle,
} from 'lucide-react'
import { Avatar, Badge, Button, Card, Input, Modal, Skeleton, Spinner } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useAllTeams, useMyTeams, useCreateTeam, useJoinTeam, useTeamMembers } from '@/hooks/useTeams'
import { useAuthContext } from '@/context/AuthContext'
import { getAITeammateRecommendations, joinTeam } from '@/services/teamsService'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { TeamWithMemberCount, AITeammateRecommendation } from '@/types/group.types'

// ── Skill chips input ─────────────────────────────────────────
function SkillInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('')
  const add = () => {
    const t = input.trim()
    if (t && !value.includes(t)) { onChange([...value, t]); setInput('') }
  }
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add skill (e.g. React, Python)"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        <Button type="button" variant="secondary" size="sm" onClick={add}>Add</Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(s => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {s}
              <button type="button" onClick={() => onChange(value.filter(x => x !== s))} className="hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Create team modal ─────────────────────────────────────────
function CreateTeamModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (id: string) => void
}) {
  const { user }    = useAuthContext()
  const createTeam  = useCreateTeam()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [course,      setCourse]      = useState('')
  const [skills,      setSkills]      = useState<string[]>([])
  const [deadline,    setDeadline]    = useState('')

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Team name is required'); return }
    if (!user) return
    try {
      const team = await createTeam.mutateAsync({
        userId: user.id, name: name.trim(), description, course, requiredSkills: skills,
        deadline: deadline || null,
      })
      toast.success('Team created!')
      onClose()
      onCreated(team.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create team')
    }
  }

  const handleClose = () => {
    if (createTeam.isPending) return
    setName(''); setDescription(''); setCourse(''); setSkills([]); setDeadline('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create project team"
      persistent={createTeam.isPending}
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={handleClose} disabled={createTeam.isPending}>Cancel</Button>
          <Button onClick={handleCreate} loading={createTeam.isPending}
            leftIcon={<Plus className="h-4 w-4" />}>Create team</Button>
        </div>
      }>
      <div className="space-y-4">
        <Input label="Project name" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. E-Commerce App" required />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What is your project about?"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </div>
        <Input label="Course" value={course} onChange={e => setCourse(e.target.value)}
          placeholder="e.g. Software Engineering 301" />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Required skills
          </label>
          <SkillInput value={skills} onChange={setSkills} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Deadline <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100" />
        </div>
      </div>
    </Modal>
  )
}

// ── Team detail slide-over ────────────────────────────────────
function TeamDetailPanel({ team, onClose }: { team: TeamWithMemberCount; onClose: () => void }) {
  const { user }    = useAuthContext()
  const joinTeamMut = useJoinTeam()
  const { data: members = [], isLoading: membersLoading } = useTeamMembers(team.id)

  const [aiRecs,    setAiRecs]    = useState<AITeammateRecommendation[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [inviteSent,setInviteSent]= useState<Set<string>>(new Set())

  const isLead   = team.lead_id === user?.id
  const isMember = team.is_member

  const handleJoin = async () => {
    try {
      await joinTeamMut.mutateAsync(team.id)
      toast.success('Joined team!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join team')
    }
  }

  const fetchAIRecs = async () => {
    setLoadingAI(true)
    try {
      const recs = await getAITeammateRecommendations(team.id, team.required_skills, team.course, user!.id)
      setAiRecs(recs)
    } catch { toast.error('AI recommendations failed') }
    finally { setLoadingAI(false) }
  }

  const handleInvite = async (userId: string) => {
    try {
      await joinTeam(team.id, userId)
      setInviteSent(prev => new Set(prev).add(userId))
      toast.success('Member added to team')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not invite member')
    }
  }

  return (
    <Modal open onClose={onClose} title={team.name} size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {!isMember && (
            <Button onClick={handleJoin} loading={joinTeamMut.isPending}
              leftIcon={<UserPlus className="h-4 w-4" />}>Join team</Button>
          )}
        </div>
      }>
      <div className="space-y-5">
        {/* Info */}
        <div className="grid gap-3 sm:grid-cols-2">
          {team.course && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Code2 className="h-4 w-4 shrink-0 text-gray-400" />
              {team.course}
            </div>
          )}
          {team.deadline && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
              Due {formatDate(team.deadline)}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4 shrink-0 text-gray-400" />
            {team.member_count} member{team.member_count !== 1 ? 's' : ''}
          </div>
        </div>

        {team.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{team.description}</p>
        )}

        {/* Required skills */}
        {team.required_skills?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Required skills</p>
            <div className="flex flex-wrap gap-1.5">
              {team.required_skills.map(s => (
                <Badge key={s} color="secondary" size="sm">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Members */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Team members</p>
          {membersLoading ? <Spinner size="sm" /> : (
            <ul className="space-y-2">
              {members.map(m => (
                <li key={m.user_id} className="flex items-center gap-2">
                  <Avatar src={m.profile?.avatar_url} name={m.profile?.full_name ?? ''} size="sm" />
                  <Link to={`/profile/${m.user_id}`}
                    className="text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100">
                    {m.profile?.full_name ?? 'Member'}
                  </Link>
                  <Badge color={m.role === 'lead' ? 'primary' : 'default'} size="sm">{m.role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* AI teammate recommendations (lead only) */}
        {isLead && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">AI Teammate Recommendations</p>
              <Button size="sm" variant="secondary" onClick={fetchAIRecs} loading={loadingAI}
                leftIcon={<Zap className="h-3.5 w-3.5" />}>
                Find teammates
              </Button>
            </div>
            {loadingAI && <div className="flex justify-center py-4"><Spinner /></div>}
            {aiRecs.length > 0 && (
              <ul className="space-y-3">
                {aiRecs.map(rec => (
                  <li key={rec.user_id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <Avatar src={rec.profile.avatar_url} name={rec.profile.full_name} size="sm" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/profile/${rec.user_id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100">
                          {rec.profile.full_name}
                        </Link>
                        <Badge color="success" size="sm">{rec.match_percentage}% match</Badge>
                      </div>
                      {rec.matching_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rec.matching_skills.map(s => <Badge key={s} color="secondary" size="sm">{s}</Badge>)}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">{rec.explanation}</p>
                    </div>
                    <button
                      onClick={() => handleInvite(rec.user_id)}
                      disabled={inviteSent.has(rec.user_id)}
                      aria-label={`Invite ${rec.profile.full_name}`}
                      className={cn('shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        inviteSent.has(rec.user_id)
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 cursor-default'
                          : 'bg-primary-600 text-white hover:bg-primary-700')}>
                      {inviteSent.has(rec.user_id) ? <CheckCircle className="h-3.5 w-3.5" /> : 'Invite'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Team card ─────────────────────────────────────────────────
function TeamCard({ team, onOpen }: { team: TeamWithMemberCount; onOpen: () => void }) {
  return (
    <Card padding="md" className="cursor-pointer transition-shadow hover:shadow-md" onClick={onOpen}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <Hammer className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-gray-900 dark:text-gray-100">{team.name}</span>
            {team.is_member && <Badge color="success" size="sm">Member</Badge>}
            {team.course && <Badge color="primary" size="sm">{team.course}</Badge>}
          </div>
          {team.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">{team.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{team.member_count} members</span>
            {team.deadline && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Due {formatDate(team.deadline)}</span>}
          </div>
          {team.required_skills?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {team.required_skills.slice(0, 4).map(s => <Badge key={s} color="secondary" size="sm">{s}</Badge>)}
              {team.required_skills.length > 4 && <Badge color="default" size="sm">+{team.required_skills.length - 4}</Badge>}
            </div>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 mt-1" aria-hidden="true" />
      </div>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────
type Tab = 'mine' | 'browse'

export default function TeamsPage() {
  const { data: allTeams  = [], isLoading: allLoading  } = useAllTeams()
  const { data: myTeams   = [], isLoading: myLoading   } = useMyTeams()

  const [tab,          setTab]          = useState<Tab>('mine')
  const [createOpen,   setCreateOpen]   = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<TeamWithMemberCount | null>(null)

  const myIds   = new Set(myTeams.map(t => t.id))
  const browse  = allTeams.filter(t => !myIds.has(t.id))

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-semibold text-gray-900 dark:text-gray-100">Project Teams</h1>
          <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
            Form teams for assignments and semester projects
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Create team
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900" role="tablist">
        {[
          { id: 'mine'   as Tab, label: `My Teams (${myTeams.length})` },
          { id: 'browse' as Tab, label: 'Browse Teams'                  },
        ].map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              tab === t.id ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400')}>
            {t.label}
          </button>
        ))}
      </div>

      <CreateTeamModal open={createOpen} onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          const team = allTeams.find(t => t.id === id) ?? myTeams.find(t => t.id === id)
          if (team) setSelectedTeam(team)
        }} />

      {/* My Teams */}
      {tab === 'mine' && (
        myLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton.Card key={i} />)}</div>
        ) : myTeams.length === 0 ? (
          <EmptyState icon={<Hammer className="h-7 w-7" />}
            title="You haven't joined any teams yet"
            description="Create a new project team or browse existing ones"
            action={<Button variant="secondary" onClick={() => setTab('browse')}>Browse teams</Button>} />
        ) : (
          <div className="space-y-3">
            {myTeams.map(t => <TeamCard key={t.id} team={t} onOpen={() => setSelectedTeam(t)} />)}
          </div>
        )
      )}

      {/* Browse */}
      {tab === 'browse' && (
        allLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton.Card key={i} />)}</div>
        ) : browse.length === 0 ? (
          <EmptyState icon={<Hammer className="h-7 w-7" />}
            title="No teams to browse"
            description="Be the first to create a project team!" />
        ) : (
          <div className="space-y-3">
            {browse.map(t => <TeamCard key={t.id} team={t} onOpen={() => setSelectedTeam(t)} />)}
          </div>
        )
      )}

      {/* Detail panel */}
      {selectedTeam && (
        <TeamDetailPanel team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </div>
  )
}
