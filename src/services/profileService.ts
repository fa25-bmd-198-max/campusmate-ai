import { supabase, uploadAvatar as uploadAvatarFile } from './supabase'
import type { ProfileRow, CourseRow } from '@/types/database.types'

// ── Profile ───────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ProfileRow | null)
}

export async function updateProfile(
  userId: string,
  updates: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as ProfileRow
}

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  const publicUrl = await uploadAvatarFile(userId, file)
  await updateProfile(userId, { avatar_url: publicUrl })
  return publicUrl
}

export async function completeOnboarding(
  userId: string,
  profileData: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>,
): Promise<ProfileRow> {
  return updateProfile(userId, { ...profileData, onboarding_complete: true })
}

// ── Courses ───────────────────────────────────────────────────

export async function getCourses(userId: string): Promise<CourseRow[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as CourseRow[]
}

export async function addCourse(
  userId: string,
  course: { name: string; code?: string | null; instructor?: string | null },
): Promise<CourseRow> {
  const { data, error } = await supabase
    .from('courses')
    .insert({ name: course.name, code: course.code ?? null, instructor: course.instructor ?? null, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as CourseRow
}

export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', courseId)
  if (error) throw error
}

// ── Matching helpers ──────────────────────────────────────────

export async function getMatchableProfiles(currentUserId: string): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('show_in_matching', true)
    .eq('is_active', true)
    .neq('id', currentUserId)
  if (error) throw error
  return (data ?? []) as ProfileRow[]
}
