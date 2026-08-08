import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

// ── Padding variants ──────────────────────────────────────────
const paddingMap = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
} as const

export type CardPadding = keyof typeof paddingMap

// ── Root card ─────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  /** Remove the default border */
  borderless?: boolean
  /** Replace the default white background with a subtle tint */
  muted?: boolean
}

function Card({ padding = 'md', borderless = false, muted = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-shadow',
        muted
          ? 'bg-gray-50 dark:bg-gray-800/50'
          : 'bg-white dark:bg-gray-900',
        !borderless && 'border border-gray-200 dark:border-gray-800',
        'shadow-card',
        paddingMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Card.Header ───────────────────────────────────────────────
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders an action (e.g. a Button) in the top-right corner */
  action?: ReactNode
}

function CardHeader({ action, className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4',
        'border-b border-gray-100 pb-4 dark:border-gray-800',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ── Card.Title ────────────────────────────────────────────────
function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-h3 font-semibold text-gray-900 dark:text-gray-100', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

// ── Card.Description ─────────────────────────────────────────
function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('mt-0.5 text-body text-gray-500 dark:text-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ── Card.Content ──────────────────────────────────────────────
function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

// ── Card.Footer ───────────────────────────────────────────────
function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'border-t border-gray-100 pt-4 dark:border-gray-800',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Compound component assembly ───────────────────────────────
Card.Header      = CardHeader
Card.Title       = CardTitle
Card.Description = CardDescription
Card.Content     = CardContent
Card.Footer      = CardFooter

export default Card
