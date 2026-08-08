import { cn } from '@/utils/cn'

// ── Base shimmer ──────────────────────────────────────────────
interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className,
      )}
    />
  )
}

// ── Pre-built shape variants ──────────────────────────────────

/** Single text line skeleton */
function Line({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-4 w-full rounded', className)} />
}

/** Block / card placeholder */
function Block({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-24 w-full rounded-xl', className)} />
}

/** Circle skeleton (for avatars) */
function Circle({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-10 w-10 rounded-full', className)} />
}

/** A stacked group of text lines */
function Text({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3.5 rounded',
            i === lines - 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  )
}

/** Full card placeholder with an optional avatar header */
function Card({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900',
        className,
      )}
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center gap-3">
        <Circle className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      </div>
      <Text lines={3} />
    </div>
  )
}

// ── Compound assembly ─────────────────────────────────────────
Skeleton.Line   = Line
Skeleton.Block  = Block
Skeleton.Circle = Circle
Skeleton.Text   = Text
Skeleton.Card   = Card

export default Skeleton
