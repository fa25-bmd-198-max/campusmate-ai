import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  getPublicGroups, getMyGroups, getGroup,
  getGroupMembers, getMessages, sendMessage,
  createGroup, joinGroup, leaveGroup, inviteMember,
} from '@/services/groupService'

// ── Query keys ────────────────────────────────────────────────
export const groupKeys = {
  public:   ()            => ['groups', 'public']              as const,
  mine:     (uid: string) => ['groups', 'mine', uid]           as const,
  detail:   (id: string)  => ['group', id]                     as const,
  members:  (id: string)  => ['group_members', id]             as const,
  messages: (id: string)  => ['group_messages', id]            as const,
}

// ── usePublicGroups ───────────────────────────────────────────
export function usePublicGroups() {
  return useQuery({
    queryKey: groupKeys.public(),
    queryFn:  () => getPublicGroups(),
  })
}

// ── useMyGroups ───────────────────────────────────────────────
export function useMyGroups() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: groupKeys.mine(user?.id ?? ''),
    queryFn:  () => getMyGroups(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useGroup (single) ─────────────────────────────────────────
export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.detail(groupId ?? ''),
    queryFn:  () => getGroup(groupId!),
    enabled:  !!groupId,
  })
}

// ── useGroupMembers ───────────────────────────────────────────
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.members(groupId ?? ''),
    queryFn:  () => getGroupMembers(groupId!),
    enabled:  !!groupId,
  })
}

// ── useGroupMessages ──────────────────────────────────────────
export function useGroupMessages(groupId: string | undefined) {
  return useQuery({
    queryKey: groupKeys.messages(groupId ?? ''),
    queryFn:  () => getMessages(groupId!),
    enabled:  !!groupId,
    // Refresh less aggressively — Realtime subscription handles live updates
    staleTime: 30_000,
  })
}

// ── useSendMessage ────────────────────────────────────────────
export function useSendMessage(groupId: string) {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) => sendMessage(groupId, user!.id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.messages(groupId) })
    },
  })
}

// ── useCreateGroup ────────────────────────────────────────────
export function useCreateGroup() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      name: string; description: string; subject: string
      isPrivate: boolean; maxMembers: number
    }) => createGroup({ ...params, userId: user!.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.mine(user!.id) })
      queryClient.invalidateQueries({ queryKey: groupKeys.public() })
    },
  })
}

// ── useJoinGroup ──────────────────────────────────────────────
export function useJoinGroup() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => joinGroup(groupId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.mine(user!.id) })
      queryClient.invalidateQueries({ queryKey: groupKeys.public() })
    },
  })
}

// ── useLeaveGroup ─────────────────────────────────────────────
export function useLeaveGroup() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.mine(user!.id) })
      queryClient.invalidateQueries({ queryKey: groupKeys.public() })
    },
  })
}

// ── useInviteMember ───────────────────────────────────────────
export function useInviteMember(groupId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => inviteMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) })
    },
  })
}
