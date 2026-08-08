import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  getTeams, getMyTeams, getTeam, getTeamMembers,
  createTeam, joinTeam, leaveTeam,
} from '@/services/teamsService'

export const teamKeys = {
  all:     ()            => ['teams', 'all']           as const,
  mine:    (uid: string) => ['teams', 'mine', uid]     as const,
  detail:  (id: string)  => ['team', id]               as const,
  members: (id: string)  => ['team_members', id]       as const,
}

export function useAllTeams() {
  return useQuery({ queryKey: teamKeys.all(), queryFn: getTeams })
}

export function useMyTeams() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: teamKeys.mine(user?.id ?? ''),
    queryFn:  () => getMyTeams(user!.id),
    enabled:  !!user?.id,
  })
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.detail(teamId ?? ''),
    queryFn:  () => getTeam(teamId!),
    enabled:  !!teamId,
  })
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: teamKeys.members(teamId ?? ''),
    queryFn:  () => getTeamMembers(teamId!),
    enabled:  !!teamId,
  })
}

export function useCreateTeam() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (p: Parameters<typeof createTeam>[0]) => createTeam(p),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.mine(user!.id) })
      queryClient.invalidateQueries({ queryKey: teamKeys.all() })
    },
  })
}

export function useJoinTeam() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => joinTeam(teamId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.mine(user!.id) })
      queryClient.invalidateQueries({ queryKey: teamKeys.all() })
    },
  })
}

export function useLeaveTeam() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => leaveTeam(teamId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.mine(user!.id) })
      queryClient.invalidateQueries({ queryKey: teamKeys.all() })
    },
  })
}
