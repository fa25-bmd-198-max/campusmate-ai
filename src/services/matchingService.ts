import { supabase } from './supabase'
import { getProfile, getMatchableProfiles } from './profileService'
import { generateStructuredOutput, Prompts, PartnerMatchSchema } from './ai'
import type { ConnectionRow, ConnectionWithProfile, PartnerMatch } from '@/types/matching.types'
import type { ProfileRow } from '@/types/database.types'
import type { PartnerMatchResult } from '@/types/ai.types'

// ── AI matching ───────────────────────────────────────────────

/**
 * Fetches all matchable profiles, sends them to Gemini for scoring,
 * then enriches each result with the full profile object.
 * Returns up to 10 sorted matches.
 */
export async function getAIMatches(currentUserId: string): Promise<PartnerMatch[]> {
  // 1. Get current user profile
  const currentProfile = await getProfile(currentUserId)
  if (!currentProfile) throw new Error('Your profile could not be loaded.')

  // 2. Get all other matchable profiles
  const candidates = await getMatchableProfiles(currentUserId)
  if (candidates.length === 0) return []

  // 3. Build compact profile summary strings for the AI prompt
  const summarise = (p: ProfileRow) => JSON.stringify({
    id:             p.id,
    semester:       p.semester,
    learning_style: p.learning_style,
    skills:         p.skills?.slice(0, 8),
    weak_subjects:  p.weak_subjects?.slice(0, 5),
    interests:      p.interests?.slice(0, 5),
    study_hours:    p.study_hours_per_day,
    availability:   p.weekly_availability
      ? Object.keys(p.weekly_availability).join(', ')
      : 'not set',
  })

  // Cap candidates at 30 to keep prompt under token limit
  const candidateSample = candidates.slice(0, 30)

  // Fetch courses for current user
  const { data: currentCourses } = await supabase
    .from('courses').select('name').eq('user_id', currentUserId)
  const currentCourseName = (currentCourses ?? []).map((c) => c.name)

  // Fetch courses for each candidate
  const candidateCoursesMap: Record<string, string[]> = {}
  const { data: allCandidateCourses } = await supabase
    .from('courses')
    .select('user_id, name')
    .in('user_id', candidateSample.map((c) => c.id))
  ;(allCandidateCourses ?? []).forEach((r) => {
    if (!candidateCoursesMap[r.user_id]) candidateCoursesMap[r.user_id] = []
    candidateCoursesMap[r.user_id].push(r.name)
  })

  const currentSummary = `${summarise(currentProfile)}, courses: [${currentCourseName.join(', ')}]`
  const candidatesSummary = candidateSample
    .map((p) => `${summarise(p)}, courses: [${(candidateCoursesMap[p.id] ?? []).join(', ')}]`)
    .join('\n')

  // 4. AI scoring
  let aiResults: PartnerMatchResult[]
  try {
    aiResults = await generateStructuredOutput(
      Prompts.partnerMatch(currentSummary, candidatesSummary),
      PartnerMatchSchema,
    )
  } catch {
    // If AI fails, fall back to simple score-0 matches so the UI still shows profiles
    aiResults = candidateSample.map((p) => ({
      user_id:             p.id,
      score:               0,
      explanation:         'AI matching temporarily unavailable.',
      shared_courses:      [],
      shared_availability: [],
    }))
  }

  // 5. Enrich with full profile objects and limit to top 10
  const profileMap = Object.fromEntries(candidateSample.map((p) => [p.id, p]))
  const enriched: PartnerMatch[] = aiResults
    .filter((r) => !!profileMap[r.user_id])
    .slice(0, 10)
    .map((r) => ({ ...r, profile: profileMap[r.user_id] }))

  // Sort by score descending
  return enriched.sort((a, b) => b.score - a.score)
}

// ── Connections CRUD ─────────────────────────────────────────

export async function sendConnectionRequest(
  senderId:   string,
  receiverId: string,
): Promise<ConnectionRow> {
  const { data, error } = await supabase
    .from('connections')
    .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
    .select()
    .single()
  if (error) {
    // Unique constraint — already sent
    if (error.code === '23505') throw new Error('Connection request already sent.')
    throw error
  }

  // Notify the receiver via the create_notification RPC
  try {
    await supabase.rpc('create_notification', {
      p_user_id: receiverId,
      p_type:    'connection_request',
      p_title:   'New connection request',
      p_message: 'Someone wants to study with you!',
      p_link:    '/matching',
    })
  } catch { /* notification is non-fatal */ }

  return data as ConnectionRow
}

export async function respondToRequest(
  connectionId: string,
  status:       'accepted' | 'declined',
): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .update({ status })
    .eq('id', connectionId)
  if (error) throw error
}

export async function cancelConnection(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('connections')
    .delete()
    .eq('id', connectionId)
  if (error) throw error
}

/**
 * Returns all connections for the current user enriched with the
 * other party's profile. Includes pending, accepted, and declined.
 */
export async function getConnections(userId: string): Promise<ConnectionWithProfile[]> {
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data?.length) return []

  // Collect the IDs of the other parties
  const otherIds = data.map((c) =>
    c.sender_id === userId ? c.receiver_id : c.sender_id,
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', otherIds)

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p as ProfileRow]))

  return data.map((c) => {
    const otherId = c.sender_id === userId ? c.receiver_id : c.sender_id
    return {
      id:           c.id,
      sender_id:    c.sender_id,
      receiver_id:  c.receiver_id,
      status:       c.status as 'pending' | 'accepted' | 'declined',
      created_at:   c.created_at,
      otherProfile: profileMap[otherId] ?? null,
      isSender:     c.sender_id === userId,
    }
  })
}

/**
 * Returns a map of user_id → connection status/id for the current user.
 * Used by PartnerMatchCard to know which button state to show.
 */
export async function getConnectionStatusMap(
  userId: string,
): Promise<Record<string, { status: 'pending' | 'accepted' | 'declined'; id: string; isSender: boolean }>> {
  const { data } = await supabase
    .from('connections')
    .select('id, sender_id, receiver_id, status')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

  const map: Record<string, { status: 'pending' | 'accepted' | 'declined'; id: string; isSender: boolean }> = {}
  ;(data ?? []).forEach((c) => {
    const otherId = c.sender_id === userId ? c.receiver_id : c.sender_id
    map[otherId] = {
      status:   c.status as 'pending' | 'accepted' | 'declined',
      id:       c.id,
      isSender: c.sender_id === userId,
    }
  })
  return map
}
