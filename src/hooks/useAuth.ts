import { useAuthContext } from '@/context/AuthContext'
import {
  signIn,
  signUp,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateEmail,
  resendVerificationEmail,
} from '@/services/authService'
import type { SignUpData } from '@/services/authService'

/**
 * Primary auth hook.
 *
 * Exposes the current session / user from AuthContext plus all
 * authService methods so components never import from authService directly.
 */
export function useAuth() {
  const { session, user, loading } = useAuthContext()

  return {
    // State
    session,
    user,
    loading,
    isAuthenticated: !!session,

    // Methods — all return { error } or { user, session, error }
    signUp:                   (data: SignUpData)    => signUp(data),
    signIn:                   (email: string, password: string) => signIn(email, password),
    signOut:                  ()                    => signOut(),
    sendPasswordResetEmail:   (email: string)       => sendPasswordResetEmail(email),
    updatePassword:           (password: string)    => updatePassword(password),
    updateEmail:              (email: string)       => updateEmail(email),
    resendVerificationEmail:  (email: string)       => resendVerificationEmail(email),
  }
}
