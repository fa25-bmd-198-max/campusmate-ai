import { useRef, useState, useEffect } from 'react'

interface UseVirtualListOptions {
  /** Total number of items */
  total:       number
  /** Fixed height of each row in px */
  itemHeight:  number
  /** Number of rows to render outside the visible viewport (buffer) */
  overscan?:   number
}

interface VirtualListState {
  /** Index of the first rendered item */
  startIndex:  number
  /** Index of the last rendered item */
  endIndex:    number
  /** Offset px for the inner spacer at the top */
  offsetTop:   number
  /** Total height of the virtual list container */
  totalHeight: number
}

/**
 * Lightweight virtualization hook for fixed-height item lists.
 * Only activates when `total > threshold` (default 50) — otherwise
 * returns full range so small lists render normally.
 *
 * Usage:
 *   const { containerRef, virtualState } = useVirtualList({ total, itemHeight: 72 })
 *   // Render only items[startIndex..endIndex], wrapped in a container with totalHeight
 */
export function useVirtualList(
  options: UseVirtualListOptions,
  threshold = 50,
) {
  const { total, itemHeight, overscan = 5 } = options
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop,  setScrollTop]  = useState(0)
  const [viewHeight, setViewHeight] = useState(600)

  // Observe container height and scroll position
  useEffect(() => {
    const el = containerRef.current
    if (!el || total <= threshold) return

    const handleScroll = () => setScrollTop(el.scrollTop)
    const ro = new ResizeObserver(() => setViewHeight(el.clientHeight))

    el.addEventListener('scroll', handleScroll, { passive: true })
    ro.observe(el)
    setViewHeight(el.clientHeight)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      ro.disconnect()
    }
  }, [total, threshold])

  // If list is small enough, render everything
  if (total <= threshold) {
    return {
      containerRef,
      virtualState: {
        startIndex:  0,
        endIndex:    total - 1,
        offsetTop:   0,
        totalHeight: total * itemHeight,
      } as VirtualListState,
      isVirtual: false,
    }
  }

  const totalHeight = total * itemHeight
  const startIndex  = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex    = Math.min(
    total - 1,
    Math.ceil((scrollTop + viewHeight) / itemHeight) + overscan,
  )
  const offsetTop   = startIndex * itemHeight

  return {
    containerRef,
    virtualState: { startIndex, endIndex, offsetTop, totalHeight } as VirtualListState,
    isVirtual: true,
  }
}
