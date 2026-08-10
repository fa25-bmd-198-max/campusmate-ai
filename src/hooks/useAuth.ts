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

export function useAuth() {
  const { session, user, loading, armSignUpBlock, clearSignUpBlock } = useAuthContext()

  /**
   * Registers a new user and guarantees they are NOT signed in afterwards.
   * Arms AuthContext's SIGNED_IN block before calling Supabase, then disarms
   * it after the internal signOut() completes. Three-layer defence:
   *   1. Block in AuthContext drops the SIGNED_IN event immediately
   *   2. signOut() in authService destroys the session server + localStorage
   *   3. clearSignUpBlock() re-enables normal logins
   */
  const signUpSecure = (data: Omit<SignUpData, 'onBeforeSignUp' | 'onAfterSignOut'>) =>
    signUp({
      ...data,
      onBeforeSignUp: armSignUpBlock,
      onAfterSignOut: clearSignUpBlock,
    })

  return {
    session,
    user,
    loading,
    isAuthenticated: !!session,

    signUp:                  signUpSecure,
    signIn:                  (email: string, password: string) => signIn(email, password),
    signOut:                 () => signOut(),
    sendPasswordResetEmail:  (email: string) => sendPasswordResetEmail(email),
    updatePassword:          (password: string) => updatePassword(password),
    updateEmail:             (email: string) => updateEmail(email),
    resendVerificationEmail: (email: string) => resendVerificationEmail(email),
  }
}
