import { supabase } from './supabase'
import { getMatchableProfiles } from './profileService'
import { generateText } from './ai'
import type { ProjectTeamRow } from '@/types/group.types'
import type { TeamWithMemberCount, TeamMemberWithProfile, AITeammateRecommendation } from '@/types/group.types'
import type { ProfileRow } from '@/types/database.types'

// ── Teams CRUD ────────────────────────────────────────────────

export async function getTeams(): Promise<TeamWithMemberCount[]> {
  const { data, error } = await supabase
    .from('project_teams')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return enrichTeamsWithCount(data ?? [], null)
}

export async function getMyTeams(userId: string): Promise<TeamWithMemberCount[]> {
  const { data: memberships } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
  if (!memberships?.length) return []

  const ids = memberships.map(m => m.team_id)
  const { data, error } = await supabase
    .from('project_teams')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error
  return enrichTeamsWithCount(data ?? [], userId)
}

export async function getTeam(teamId: string): Promise<ProjectTeamRow | null> {
  const { data, error } = await supabase
    .from('project_teams')
    .select('*')
    .eq('id', teamId)
    .maybeSingle()
  if (error) throw error
  return data as ProjectTeamRow | null
}

async function enrichTeamsWithCount(
  teams: ProjectTeamRow[],
  userId: string | null,
): Promise<TeamWithMemberCount[]> {
  if (!teams.length) return []
  const ids = teams.map(t => t.id)
  const { data: memberships } = await supabase
    .from('team_members').select('team_id, user_id').in('team_id', ids)
  const countMap: Record<string, number>  = {}
  const memberSet: Record<string, boolean> = {}
  ;(memberships ?? []).forEach(m => {
    countMap[m.team_id] = (countMap[m.team_id] ?? 0) + 1
    if (userId && m.user_id === userId) memberSet[m.team_id] = true
  })
  return teams.map(t => ({ ...t, member_count: countMap[t.id] ?? 0, is_member: memberSet[t.id] ?? false }))
}

export async function createTeam(params: {
  userId:          string
  name:            string
  description:     string
  course:          string
  requiredSkills:  string[]
  deadline:        string | null
}): Promise<ProjectTeamRow> {
  const { data, error } = await supabase
    .from('project_teams')
    .insert({
      name:            params.name,
      description:     params.description || null,
      course:          params.course || null,
      required_skills: params.requiredSkills,
      deadline:        params.deadline || null,
      lead_id:         params.userId,
    })
    .select()
    .single()
  if (error) throw error

  // Auto-add creator as lead member
  await supabase.from('team_members').insert({
    team_id: data.id, user_id: params.userId, role: 'lead',
  })

  return data as ProjectTeamRow
}

export async function joinTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role: 'member' })
  if (error) {
    if (error.code === '23505') throw new Error('You are already on this team.')
    throw error
  }
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Members ───────────────────────────────────────────────────

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  if (!members?.length) return []

  const { data: profiles } = await supabase
    .from('profiles').select('*').in('id', members.map(m => m.user_id))
  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p as ProfileRow]))

  return members.map(m => ({
    ...m, role: m.role as 'lead' | 'member', profile: profileMap[m.user_id] ?? null,
  })) as TeamMemberWithProfile[]
}

// ── AI teammate recommendations ───────────────────────────────

export async function getAITeammateRecommendations(
  teamId:          string,
  requiredSkills:  string[],
  course:          string | null,
  currentLeadId:   string,
): Promise<AITeammateRecommendation[]> {
  // Get all potential candidates
  const candidates = await getMatchableProfiles(currentLeadId)
  if (!candidates.length) return []

  // Get existing team member IDs to exclude them
  const { data: existing } = await supabase
    .from('team_members').select('user_id').eq('team_id', teamId)
  const existingIds = new Set((existing ?? []).map(m => m.user_id))
  const available   = candidates.filter(p => !existingIds.has(p.id)).slice(0, 20)
  if (!available.length) return []

  const prompt = `You are a project team builder. A team is working on ${course ?? 'a project'}.
Required skills: ${requiredSkills.join(', ')}.

Evaluate these candidates and return a JSON array of the top 5 most suitable teammates.
Candidates:
${available.map(p => JSON.stringify({
  id: p.id, skills: p.skills?.slice(0, 8), interests: p.interests?.slice(0, 5), semester: p.semester,
})).join('\n')}

Respond with ONLY a valid JSON array — no markdown, no extra text:
[{ "user_id": "string", "match_percentage": number, "matching_skills": ["string"], "explanation": "string (one sentence)" }]`

  let recs: Array<{ user_id: string; match_percentage: number; matching_skills: string[]; explanation: string }> = []
  try {
    const text    = await generateText(prompt)
    const cleaned = text.replace(/^```(?:json)?|```$/gm, '').trim()
    recs = JSON.parse(cleaned)
  } catch {
    // Fallback: manual skill intersection scoring
    recs = available.slice(0, 5).map(p => {
      const overlap = (p.skills ?? []).filter(s => requiredSkills.some(r => s.toLowerCase().includes(r.toLowerCase())))
      const pct     = Math.min(100, Math.round((overlap.length / Math.max(requiredSkills.length, 1)) * 100))
      return { user_id: p.id, match_percentage: pct, matching_skills: overlap, explanation: 'Skill overlap match.' }
    })
  }

  const profileMap = Object.fromEntries(available.map(p => [p.id, p]))
  return recs
    .filter(r => !!profileMap[r.user_id])
    .map(r => ({ ...r, profile: profileMap[r.user_id] }))
    .sort((a, b) => b.match_percentage - a.match_percentage)
}
