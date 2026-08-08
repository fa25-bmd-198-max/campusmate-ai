import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  getProfile,
  updateProfile,
  uploadProfileAvatar,
  getCourses,
  addCourse,
  deleteCourse,
} from '@/services/profileService'
import type { ProfileInsert, CourseInsert } from '@/types/database.types'

// ── Query keys ────────────────────────────────────────────────
const profileKey  = (id: string) => ['profile', id] as const
const coursesKey  = (id: string) => ['courses', id] as const

// ── useProfile ────────────────────────────────────────────────
export function useProfile(overrideUserId?: string) {
  const { user } = useAuthContext()
  const userId   = overrideUserId ?? user?.id

  const { data: profile, isLoading, error } = useQuery({
    queryKey: profileKey(userId ?? ''),
    queryFn:  () => getProfile(userId!),
    enabled:  !!userId,
  })

  return { profile: profile ?? null, isLoading, error }
}

// ── useUpdateProfile ──────────────────────────────────────────
export function useUpdateProfile() {
  const { user }       = useAuthContext()
  const queryClient    = useQueryClient()

  return useMutation({
    mutationFn: (updates: ProfileInsert) => updateProfile(user!.id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(profileKey(user!.id), updated)
    },
  })
}

// ── useUploadAvatar ───────────────────────────────────────────
export function useUploadAvatar() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadProfileAvatar(user!.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(user!.id) })
    },
  })
}

// ── useCourses ────────────────────────────────────────────────
export function useCourses() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: coursesKey(user?.id ?? ''),
    queryFn:  () => getCourses(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useAddCourse ──────────────────────────────────────────────
export function useAddCourse() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (course: Pick<CourseInsert, 'name' | 'code' | 'instructor'>) =>
      addCourse(user!.id, course),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coursesKey(user!.id) })
    },
  })
}

// ── useDeleteCourse ───────────────────────────────────────────
export function useDeleteCourse() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: coursesKey(user!.id) })
    },
  })
}
