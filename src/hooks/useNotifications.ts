import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import { supabase } from '@/services/supabase'
import type { NotificationRow } from '@/types/database.types'

// ── Query key ─────────────────────────────────────────────────
export const notifKeys = {
  all: (uid: string) => ['notifications', uid] as const,
}

// ── Service functions ─────────────────────────────────────────

async function fetchNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []) as NotificationRow[]
}

async function markOneRead(notifId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notifId)
  if (error) throw error
}

async function markAllReadForUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
  if (error) throw error
}

// ── useNotifications ──────────────────────────────────────────
export function useNotifications() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: notifKeys.all(user?.id ?? ''),
    queryFn:  () => fetchNotifications(user!.id),
    enabled:  !!user?.id,
    staleTime: 0,   // always re-fetch so unread state is fresh
  })
}

// ── useMarkRead ───────────────────────────────────────────────
export function useMarkRead() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notifId: string) => markOneRead(notifId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all(user!.id) })
    },
  })
}

// ── useMarkAllRead ────────────────────────────────────────────
export function useMarkAllRead() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => markAllReadForUser(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notifKeys.all(user!.id) })
    },
  })
}
