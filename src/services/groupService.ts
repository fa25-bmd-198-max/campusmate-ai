import { supabase } from './supabase'
import { generateText } from './ai'
import type {
  StudyGroupRow, GroupMessageRow,
} from '@/types/group.types'
import type {
  GroupWithMemberCount, MessageWithProfile, MemberWithProfile,
} from '@/types/group.types'

// ── Study Groups CRUD ─────────────────────────────────────────

export async function getPublicGroups(): Promise<GroupWithMemberCount[]> {
  const { data: groups, error } = await supabase
    .from('study_groups')
    .select('*')
    .eq('is_private', false)
    .order('created_at', { ascending: false })
  if (error) throw error

  return await enrichGroupsWithMemberCount(groups ?? [], null)
}

export async function getMyGroups(userId: string): Promise<GroupWithMemberCount[]> {
  const { data: memberships, error: mErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
  if (mErr) throw mErr
  if (!memberships?.length) return []

  const ids = memberships.map((m) => m.group_id)
  const { data: groups, error } = await supabase
    .from('study_groups')
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false })
  if (error) throw error

  return await enrichGroupsWithMemberCount(groups ?? [], userId)
}

async function enrichGroupsWithMemberCount(
  groups: StudyGroupRow[],
  userId: string | null,
): Promise<GroupWithMemberCount[]> {
  if (!groups.length) return []

  const ids = groups.map((g) => g.id)
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, user_id')
    .in('group_id', ids)

  const countMap: Record<string, number> = {}
  const memberSet: Record<string, boolean> = {}
  ;(memberships ?? []).forEach((m) => {
    countMap[m.group_id] = (countMap[m.group_id] ?? 0) + 1
    if (userId && m.user_id === userId) memberSet[m.group_id] = true
  })

  return groups.map((g) => ({
    ...g,
    member_count: countMap[g.id] ?? 0,
    is_member:    userId ? (memberSet[g.id] ?? false) : false,
  }))
}

export async function getGroup(groupId: string): Promise<StudyGroupRow | null> {
  const { data, error } = await supabase
    .from('study_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()
  if (error) throw error
  return data as StudyGroupRow | null
}

export async function createGroup(params: {
  userId:      string
  name:        string
  description: string
  subject:     string
  isPrivate:   boolean
  maxMembers:  number
}): Promise<StudyGroupRow> {
  const { data, error } = await supabase
    .from('study_groups')
    .insert({
      name:        params.name,
      description: params.description || null,
      subject:     params.subject || null,
      is_private:  params.isPrivate,
      max_members: params.maxMembers,
      admin_id:    params.userId,
    })
    .select()
    .single()
  if (error) throw error

  // Automatically add creator as admin member
  await supabase.from('group_members').insert({
    group_id: data.id,
    user_id:  params.userId,
    role:     'admin',
  })

  return data as StudyGroupRow
}

export async function joinGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member' })
  if (error) {
    if (error.code === '23505') throw new Error('You are already a member of this group.')
    throw error
  }
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function inviteMember(groupId: string, userId: string): Promise<void> {
  await joinGroup(groupId, userId)
  // Notify the invited user
  try {
    await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type:    'group_invite',
      p_title:   'You were added to a study group',
      p_link:    `/groups/${groupId}`,
    })
  } catch { /* non-fatal */ }
}

// ── Members ───────────────────────────────────────────────────

export async function getGroupMembers(groupId: string): Promise<MemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })
  if (error) throw error
  if (!members?.length) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  return members.map((m) => ({
    ...m,
    role:    m.role as 'admin' | 'member',
    profile: profileMap[m.user_id] ?? null,
  })) as MemberWithProfile[]
}

// ── Messages ──────────────────────────────────────────────────

export async function getMessages(groupId: string, limit = 50): Promise<MessageWithProfile[]> {
  const { data: msgs, error } = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  if (!msgs?.length) return []

  const userIds = [...new Set(msgs.map((m) => m.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  return msgs
    .reverse()   // return chronological order
    .map((m) => ({
      ...m,
      profile: profileMap[m.user_id] ?? null,
    })) as MessageWithProfile[]
}

export async function sendMessage(
  groupId: string,
  userId:  string,
  content: string,
): Promise<GroupMessageRow> {
  const { data, error } = await supabase
    .from('group_messages')
    .insert({ group_id: groupId, user_id: userId, content: content.trim() })
    .select()
    .single()
  if (error) throw error
  return data as GroupMessageRow
}

// ── Shared notes (plain text stored in group description or a custom field) ──
// We store notes in a simple JSON column on the group row as a lightweight solution

export async function updateGroupNotes(groupId: string, notes: string): Promise<void> {
  // We repurpose a simple text update of the group description for shared notes
  // A production app would have a separate table; this keeps migrations minimal
  const { error } = await supabase
    .from('study_groups')
    .update({ description: notes })
    .eq('id', groupId)
  if (error) throw error
}

// ── AI suggestions ────────────────────────────────────────────

export async function getAIScheduleSuggestion(
  _groupId: string,
  members: MemberWithProfile[],
): Promise<string> {
  const availabilityText = members
    .map((m) => {
      const avail = m.profile?.weekly_availability
        ? Object.keys(m.profile.weekly_availability).join(', ')
        : 'unknown'
      return `${m.profile?.full_name ?? 'Member'}: available ${avail}`
    })
    .join('\n')

  const prompt = `You are a study schedule assistant. Based on the following member availability, suggest a weekly study schedule for this group:

${availabilityText}

Provide a concise, practical schedule (2-4 sessions per week) that works for most members. Format as a short bullet list.`

  return generateText(prompt)
}

export async function getAIMemberRecommendations(
  _groupId: string,
  groupSubject: string | null,
  members: MemberWithProfile[],
): Promise<string> {
  const currentMemberCount = members.length
  const currentSkills = members
    .flatMap((m) => m.profile?.skills ?? [])
    .filter(Boolean)
    .slice(0, 10)

  const prompt = `You are a study group advisor. A study group for "${groupSubject ?? 'general studies'}" currently has ${currentMemberCount} members with these skills: ${currentSkills.join(', ')}.

Describe the ideal 2-3 types of students who would complement this group. Focus on:
- Academic strengths that would fill gaps
- Study style compatibility  
- Course overlap

Keep the response concise (3-4 sentences).`

  return generateText(prompt)
}
