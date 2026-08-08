import { createClient } from '@supabase/supabase-js'

// ── Environment validation ────────────────────────────────────
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[CampusMate AI] Missing Supabase environment variables.\n' +
    'Copy .env.example → .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  )
}

// ── Supabase client ───────────────────────────────────────────
// We use an untyped client here and rely on our service functions'
// explicit return type annotations (ProfileRow, CourseRow, etc.)
// for full TypeScript safety. This avoids inference conflicts with
// hand-written Database generics.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-app-name': 'campusmate-ai' },
  },
})

// ── Storage bucket name constants ─────────────────────────────
export const STORAGE_BUCKETS = {
  AVATARS:         'avatars',
  NOTES:           'notes',
  GROUP_RESOURCES: 'group-resources',
} as const

// ── Storage path helpers ──────────────────────────────────────

/** avatars/{userId}/avatar.{ext} */
export function avatarPath(userId: string, ext: string) {
  return `${userId}/avatar.${ext}`
}

/** notes/{userId}/{noteId}/{filename} */
export function notePath(userId: string, noteId: string, filename: string) {
  return `${userId}/${noteId}/${filename}`
}

/** group-resources/{groupId}/{filename} */
export function groupResourcePath(groupId: string, filename: string) {
  return `${groupId}/${filename}`
}

/** Returns a public URL for an avatar (bucket is public). */
export function getAvatarUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKETS.AVATARS).getPublicUrl(path)
  return data.publicUrl
}

/** Returns a signed URL for a private note file (1 hour expiry). */
export async function getNoteSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.NOTES)
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

/** Returns a signed URL for a group resource (1 hour expiry). */
export async function getGroupResourceSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.GROUP_RESOURCES)
    .createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

/**
 * Uploads a file to the notes bucket.
 * Returns the storage path on success.
 */
export async function uploadNoteFile(
  userId: string,
  noteId: string,
  file: File,
): Promise<string> {
  const path = notePath(userId, noteId, file.name)
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.NOTES)
    .upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return path
}

/**
 * Uploads an avatar image.
 * Upserts so re-uploading replaces the previous photo.
 * Returns the public URL.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = avatarPath(userId, ext)
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.AVATARS)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return getAvatarUrl(path)
}

/** Deletes a file from the notes bucket. */
export async function deleteNoteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKETS.NOTES).remove([path])
  if (error) throw error
}
