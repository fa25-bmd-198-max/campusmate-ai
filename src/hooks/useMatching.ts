import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  getAIMatches,
  getConnections,
  getConnectionStatusMap,
  sendConnectionRequest,
  respondToRequest,
  cancelConnection,
} from '@/services/matchingService'

// ── Query keys ────────────────────────────────────────────────
export const matchingKeys = {
  matches:     (uid: string) => ['ai_matches',    uid] as const,
  connections: (uid: string) => ['connections',   uid] as const,
  statusMap:   (uid: string) => ['conn_status',   uid] as const,
}

// ── useAIMatches ──────────────────────────────────────────────
/** Fetches AI-ranked partner recommendations. Disabled until manually triggered. */
export function useAIMatches(enabled: boolean) {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: matchingKeys.matches(user?.id ?? ''),
    queryFn:  () => getAIMatches(user!.id),
    enabled:  !!user?.id && enabled,
    staleTime: 10 * 60 * 1000,   // 10 min — re-use cached results
    retry: 1,
  })
}

// ── useConnections ────────────────────────────────────────────
export function useConnections() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: matchingKeys.connections(user?.id ?? ''),
    queryFn:  () => getConnections(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useConnectionStatusMap ────────────────────────────────────
export function useConnectionStatusMap() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: matchingKeys.statusMap(user?.id ?? ''),
    queryFn:  () => getConnectionStatusMap(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useSendConnectionRequest ──────────────────────────────────
export function useSendConnectionRequest() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (receiverId: string) => sendConnectionRequest(user!.id, receiverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.connections(user!.id) })
      queryClient.invalidateQueries({ queryKey: matchingKeys.statusMap(user!.id) })
    },
  })
}

// ── useRespondToRequest ───────────────────────────────────────
export function useRespondToRequest() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ connectionId, status }: { connectionId: string; status: 'accepted' | 'declined' }) =>
      respondToRequest(connectionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.connections(user!.id) })
      queryClient.invalidateQueries({ queryKey: matchingKeys.statusMap(user!.id) })
    },
  })
}

// ── useCancelConnection ───────────────────────────────────────
export function useCancelConnection() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (connectionId: string) => cancelConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.connections(user!.id) })
      queryClient.invalidateQueries({ queryKey: matchingKeys.statusMap(user!.id) })
    },
  })
}
