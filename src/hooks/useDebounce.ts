import { useState, useEffect } from 'react'

/**
 * Returns a debounced version of `value` that only updates
 * after `delay` ms of no changes (default 300ms).
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchInput, 300)
 *   // use debouncedSearch in filters/queries instead of searchInput
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
