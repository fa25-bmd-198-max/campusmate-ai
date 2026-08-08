import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  getFlashcardSets,
  getFlashcardSet,
  getFlashcards,
  deleteFlashcardSet,
  updateMastery,
  resetSetMastery,
  generateFlashcards,
} from '@/services/flashcardService'
import type { GenerateFlashcardsOptions } from '@/types/flashcard.types'

// ── Query keys ────────────────────────────────────────────────
export const flashcardKeys = {
  sets:      (uid: string)  => ['flashcard_sets', uid]         as const,
  set:       (id: string)   => ['flashcard_set',  id]          as const,
  cards:     (setId: string)=> ['flashcards',     setId]       as const,
}

// ── useFlashcardSets — library list ──────────────────────────
export function useFlashcardSets() {
  const { user } = useAuthContext()

  return useQuery({
    queryKey: flashcardKeys.sets(user?.id ?? ''),
    queryFn:  () => getFlashcardSets(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useFlashcardSet — single set metadata ────────────────────
export function useFlashcardSet(setId: string | undefined) {
  return useQuery({
    queryKey: flashcardKeys.set(setId ?? ''),
    queryFn:  () => getFlashcardSet(setId!),
    enabled:  !!setId,
  })
}

// ── useFlashcards — cards in a set ───────────────────────────
export function useFlashcards(setId: string | undefined) {
  return useQuery({
    queryKey: flashcardKeys.cards(setId ?? ''),
    queryFn:  () => getFlashcards(setId!),
    enabled:  !!setId,
  })
}

// ── useDeleteFlashcardSet ────────────────────────────────────
export function useDeleteFlashcardSet() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (setId: string) => deleteFlashcardSet(setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.sets(user!.id) })
    },
  })
}

// ── useUpdateMastery ─────────────────────────────────────────
export function useUpdateMastery(setId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ cardId, mastered }: { cardId: string; mastered: boolean }) =>
      updateMastery(cardId, mastered),
    // Optimistic update: flip the card locally immediately
    onMutate: async ({ cardId, mastered }) => {
      await queryClient.cancelQueries({ queryKey: flashcardKeys.cards(setId) })
      const previous = queryClient.getQueryData(flashcardKeys.cards(setId))
      queryClient.setQueryData(flashcardKeys.cards(setId), (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((c: { id: string }) =>
          c.id === cardId ? { ...c, mastered } : c,
        )
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(flashcardKeys.cards(setId), context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.cards(setId) })
      queryClient.invalidateQueries({ queryKey: flashcardKeys.set(setId) })
    },
  })
}

// ── useResetMastery ──────────────────────────────────────────
export function useResetMastery(setId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => resetSetMastery(setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: flashcardKeys.cards(setId) })
      queryClient.invalidateQueries({ queryKey: flashcardKeys.set(setId) })
    },
  })
}

// ── useGenerateFlashcards ────────────────────────────────────
export function useGenerateFlashcards() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState<string | null>(null)

  const generate = useCallback(
    async (options: Omit<GenerateFlashcardsOptions, 'noteTitle'> & { noteTitle: string }) => {
      if (!user) return null
      setGenerating(true)
      setGenError(null)

      try {
        const set = await generateFlashcards(user.id, options)
        queryClient.invalidateQueries({ queryKey: flashcardKeys.sets(user.id) })
        return set
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed.'
        setGenError(msg)
        return null
      } finally {
        setGenerating(false)
      }
    },
    [user, queryClient],
  )

  return { generate, generating, genError, resetError: () => setGenError(null) }
}
