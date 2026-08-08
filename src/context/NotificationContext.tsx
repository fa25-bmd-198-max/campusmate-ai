import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/services/supabase'
import { useAuthContext } from './AuthContext'

// ── Context value ─────────────────────────────────────────────
interface NotificationContextValue {
  unreadCount:    number
  setUnreadCount: (count: number) => void
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

// ── Provider ──────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user }                       = useAuthContext()
  const [unreadCount, setUnreadCount]  = useState(0)

  // ── Initial unread count ──────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setUnreadCount(0); return }

    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [user?.id])

  // ── Realtime: increment on new INSERT ─────────────────────
  // Per design.md §12 — Realtime is enabled for `notifications` table.
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notifications-badge-${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadCount((c) => c + 1)
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        // Re-fetch count after a mark-read mutation
        () => {
          supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false)
            .then(({ count }) => setUnreadCount(count ?? 0))
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────
export function useNotificationContext() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider')
  return ctx
}
