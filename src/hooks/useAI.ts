import { useState, useCallback } from 'react'
import type { AIState } from '@/types/ai.types'

/**
 * Generic AI operation hook.
 * Wraps any async AI function call with loading/error state and a retry mechanism.
 *
 * Usage:
 *   const { run, loading, error, reset } = useAI()
 *   const result = await run(() => generateText(prompt))
 */
export function useAI() {
  const [state, setState] = useState<AIState>({ loading: false, error: null })

  // Last function reference for retry
  const [lastFn, setLastFn] = useState<(() => Promise<unknown>) | null>(null)

  const run = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setState({ loading: true, error: null })
    setLastFn(() => fn)

    try {
      const result = await fn()
      setState({ loading: false, error: null })
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setState({ loading: false, error: message })
      return null
    }
  }, [])

  const retry = useCallback(async () => {
    if (!lastFn) return null
    return run(lastFn as () => Promise<unknown>)
  }, [lastFn, run])

  const reset = useCallback(() => {
    setState({ loading: false, error: null })
    setLastFn(null)
  }, [])

  return {
    ...state,
    run,
    retry,
    reset,
  }
}

/**
 * Simplified hook for a single AI call with inline state.
 * Useful for one-shot AI features (not conversation-based).
 */
export function useAICall<TResult>() {
  const [data,    setData]    = useState<TResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const execute = useCallback(async (fn: () => Promise<TResult>): Promise<TResult | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, execute, reset }
}
