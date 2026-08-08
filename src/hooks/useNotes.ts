import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import { getNotes, getNote, deleteNote, updateNoteSubject, uploadAndSummariseNote } from '@/services/notesService'
import type { UploadStage } from '@/types/notes.types'

// ── Query keys ────────────────────────────────────────────────
export const notesKeys = {
  all:    (uid: string) => ['notes', uid]            as const,
  detail: (id: string)  => ['notes', 'detail', id]   as const,
}

// ── useNotes — list ───────────────────────────────────────────
export function useNotes() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: notesKeys.all(user?.id ?? ''),
    queryFn:  () => getNotes(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useNote — single ──────────────────────────────────────────
export function useNote(noteId: string | undefined) {
  return useQuery({
    queryKey: notesKeys.detail(noteId ?? ''),
    queryFn:  () => getNote(noteId!),
    enabled:  !!noteId,
  })
}

// ── useDeleteNote ─────────────────────────────────────────────
export function useDeleteNote() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, filePath }: { noteId: string; filePath: string | null }) =>
      deleteNote(noteId, filePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKeys.all(user!.id) })
    },
  })
}

// ── useUpdateNoteSubject ──────────────────────────────────────
export function useUpdateNoteSubject() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ noteId, subject }: { noteId: string; subject: string | null }) =>
      updateNoteSubject(noteId, subject),
    onSuccess: (_data, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: notesKeys.all(user!.id) })
      queryClient.invalidateQueries({ queryKey: notesKeys.detail(noteId) })
    },
  })
}

// ── useUploadNote — full pipeline hook ────────────────────────
export type UploadProgress = {
  stage:    UploadStage
  progress: number
  error:    string | null
}

export function useUploadNote() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  const [uploadState, setUploadState] = useState<UploadProgress>({
    stage: 'idle', progress: 0, error: null,
  })

  const upload = useCallback(
    async (params: { file: File; title: string; subject: string | null }) => {
      if (!user) return null
      setUploadState({ stage: 'validating', progress: 0, error: null })

      try {
        const note = await uploadAndSummariseNote({
          userId:  user.id,
          file:    params.file,
          title:   params.title,
          subject: params.subject,
          onStage: (stage, progress) => {
            setUploadState({ stage, progress: progress ?? 0, error: null })
          },
        })

        // Refresh the notes list
        queryClient.invalidateQueries({ queryKey: notesKeys.all(user.id) })
        setUploadState({ stage: 'done', progress: 100, error: null })
        return note
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed.'
        setUploadState({ stage: 'error', progress: 0, error: msg })
        queryClient.invalidateQueries({ queryKey: notesKeys.all(user.id) })
        return null
      }
    },
    [user, queryClient],
  )

  const reset = useCallback(() => {
    setUploadState({ stage: 'idle', progress: 0, error: null })
  }, [])

  return { upload, uploadState, reset }
}
