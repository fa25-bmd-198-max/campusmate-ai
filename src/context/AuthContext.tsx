import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'

interface AuthContextValue {
  session:          Session | null
  user:             User | null
  loading:          boolean
  /**
   * Call this BEFORE signUp(). It arms a block that drops every SIGNED_IN
   * event until clearSignUpBlock() is called. This is the last line of
   * defence against Supabase's auto-session race condition.
   */
  armSignUpBlock:   () => void
  /**
   * Call this AFTER signOut() resolves inside signUp(). It disarms the block
   * so normal logins work again.
   */
  clearSignUpBlock: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // When true, ALL SIGNED_IN events are silently dropped.
  // This is set before signUp() and cleared after the internal signOut() finishes.
  const blockSignIn = useRef(false)

  useEffect(() => {
    // Hydrate — but honour the block flag even here
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!blockSignIn.current) {
        setSession(s)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_IN' && blockSignIn.current) {
          // This is the auto-session from signUp() — drop it entirely.
          // authService.signUp() will call supabase.auth.signOut() which
          // fires SIGNED_OUT, clearing blockSignIn and setting session to null.
          return
        }
        setSession(newSession)
        setLoading(false)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  const armSignUpBlock   = () => { blockSignIn.current = true  }
  const clearSignUpBlock = () => { blockSignIn.current = false }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      armSignUpBlock,
      clearSignUpBlock,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
