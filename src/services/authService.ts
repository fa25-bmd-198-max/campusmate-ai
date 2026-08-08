import { supabase } from './supabase'
import type { Session, User, AuthError } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────

export interface AuthResult {
  user:    User | null
  session: Session | null
  error:   AuthError | null
}

export interface SignUpData {
  email:     string
  password:  string
  full_name: string
}

// ── Sign Up ───────────────────────────────────────────────────

/**
 * Registers a new user with email + password.
 * Passes full_name as user metadata so the handle_new_user trigger
 * can pre-populate the profiles row.
 */
export async function signUp({ email, password, full_name }: SignUpData): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      // Redirect URL after email verification — overridden by Supabase project settings in prod
      emailRedirectTo: `${window.location.origin}/verify-email`,
    },
  })
  return { user: data.user, session: data.session, error }
}

// ── Sign In ───────────────────────────────────────────────────

/**
 * Authenticates an existing user with email + password.
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data.user, session: data.session, error }
}

// ── Sign Out ──────────────────────────────────────────────────

/**
 * Ends the current session and clears local storage.
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// ── Password Recovery ─────────────────────────────────────────

/**
 * Sends a password reset email to the given address.
 * Uses a generic success message to prevent account enumeration —
 * the caller should always show the same UI regardless of whether
 * the email exists.
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { error }
}

/**
 * Updates the authenticated user's password.
 * Must be called from the reset-password page after the user
 * has clicked the reset link (which sets a valid session).
 */
export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}

// ── Email Verification ────────────────────────────────────────

/**
 * Re-sends the email verification link for the given address.
 */
export async function resendVerificationEmail(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resend({
    type:  'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/verify-email` },
  })
  return { error }
}

// ── Session Helpers ───────────────────────────────────────────

/**
 * Returns the current active session, or null if unauthenticated.
 */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/**
 * Returns the currently authenticated user, or null.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

/**
 * Subscribes to auth state changes. Returns an unsubscribe function.
 * Used by AuthContext to keep session state in sync.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

// ── Update User Metadata ──────────────────────────────────────

/**
 * Updates auth-level user metadata (email or password).
 * Profile fields (name, university, etc.) go through profileService instead.
 */
export async function updateEmail(newEmail: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  return { error }
}
