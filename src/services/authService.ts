import { supabase } from './supabase'
import type { Session, User, AuthError } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────

export interface AuthResult {
  user:    User | null
  session: Session | null
  error:   AuthError | null
}

export interface SignUpData {
  email:      string
  password:   string
  full_name:  string
  /**
   * Called BEFORE supabase.auth.signUp() so AuthContext can arm its
   * SIGNED_IN block before the event fires.
   */
  onBeforeSignUp?: () => void
  /**
   * Called AFTER supabase.auth.signOut() resolves so AuthContext can
   * disarm its block once the auto-session has been fully cleared.
   */
  onAfterSignOut?: () => void
}

// ── Sign Up ───────────────────────────────────────────────────

/**
 * Registers a new user then IMMEDIATELY destroys the auto-created session.
 *
 * Supabase creates a live session on signUp() when email confirmation is
 * disabled. We destroy it in three layers:
 *
 *   1. onBeforeSignUp() — arms a SIGNED_IN block in AuthContext so the
 *      auto-session event is dropped before React ever re-renders with it.
 *   2. supabase.auth.signOut() — destroys the session server-side and in
 *      localStorage, fires SIGNED_OUT which sets context.session = null.
 *   3. onAfterSignOut() — disarms the block so future logins work normally.
 *
 * The returned session is always null.
 */
export async function signUp({
  email,
  password,
  full_name,
  onBeforeSignUp,
  onAfterSignOut,
}: SignUpData): Promise<AuthResult> {
  // Layer 1 — arm the block BEFORE the signUp call so the SIGNED_IN event
  // that fires synchronously inside signUp() is caught immediately.
  onBeforeSignUp?.()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name } },
  })

  if (error) {
    // Registration failed — no session was created.
    // Disarm the block so logins still work.
    onAfterSignOut?.()
    return { user: data.user, session: null, error }
  }

  // Layer 2 — destroy the auto-created session.
  await supabase.auth.signOut()

  // Layer 3 — disarm the block.
  onAfterSignOut?.()

  return { user: data.user, session: null, error: null }
}

// ── Sign In ───────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data.user, session: data.session, error }
}

// ── Sign Out ──────────────────────────────────────────────────

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// ── Password Recovery ─────────────────────────────────────────

export async function sendPasswordResetEmail(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  return { error }
}

export async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}

// ── Email Verification ────────────────────────────────────────

export async function resendVerificationEmail(email: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resend({
    type:  'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/verify-email` },
  })
  return { error }
}

// ── Session Helpers ───────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

// ── Update User Metadata ──────────────────────────────────────

export async function updateEmail(newEmail: string): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  return { error }
}
