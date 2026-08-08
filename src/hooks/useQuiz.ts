import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@/context/AuthContext'
import {
  getQuizzes, getQuiz, getQuizQuestions,
  deleteQuiz, getAttempt, saveAttempt, generateQuiz,
} from '@/services/quizService'
import type { GenerateQuizOptions, ScoredAnswer } from '@/types/quiz.types'

// ── Query keys ────────────────────────────────────────────────
export const quizKeys = {
  all:       (uid: string)    => ['quizzes',   uid]           as const,
  detail:    (id: string)     => ['quiz',       id]           as const,
  questions: (quizId: string) => ['quiz_qs',   quizId]        as const,
  attempt:   (id: string)     => ['attempt',   id]            as const,
}

// ── useQuizzes ────────────────────────────────────────────────
export function useQuizzes() {
  const { user } = useAuthContext()
  return useQuery({
    queryKey: quizKeys.all(user?.id ?? ''),
    queryFn:  () => getQuizzes(user!.id),
    enabled:  !!user?.id,
  })
}

// ── useQuiz ───────────────────────────────────────────────────
export function useQuiz(quizId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.detail(quizId ?? ''),
    queryFn:  () => getQuiz(quizId!),
    enabled:  !!quizId,
  })
}

// ── useQuizQuestions ──────────────────────────────────────────
export function useQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.questions(quizId ?? ''),
    queryFn:  () => getQuizQuestions(quizId!),
    enabled:  !!quizId,
  })
}

// ── useDeleteQuiz ─────────────────────────────────────────────
export function useDeleteQuiz() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (quizId: string) => deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.all(user!.id) })
    },
  })
}

// ── useAttempt ────────────────────────────────────────────────
export function useAttempt(attemptId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.attempt(attemptId ?? ''),
    queryFn:  () => getAttempt(attemptId!),
    enabled:  !!attemptId,
  })
}

// ── useSaveAttempt ────────────────────────────────────────────
export function useSaveAttempt() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ quizId, answers }: { quizId: string; answers: ScoredAnswer[] }) =>
      saveAttempt(user!.id, quizId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.all(user!.id) })
    },
  })
}

// ── useGenerateQuiz ───────────────────────────────────────────
export function useGenerateQuiz() {
  const { user }    = useAuthContext()
  const queryClient = useQueryClient()

  const [generating, setGenerating] = useState(false)
  const [genError,   setGenError]   = useState<string | null>(null)

  const generate = useCallback(
    async (options: GenerateQuizOptions) => {
      if (!user) return null
      setGenerating(true)
      setGenError(null)
      try {
        const quiz = await generateQuiz(user.id, options)
        queryClient.invalidateQueries({ queryKey: quizKeys.all(user.id) })
        return quiz
      } catch (err) {
        setGenError(err instanceof Error ? err.message : 'Generation failed.')
        return null
      } finally {
        setGenerating(false)
      }
    },
    [user, queryClient],
  )

  return { generate, generating, genError, resetError: () => setGenError(null) }
}
