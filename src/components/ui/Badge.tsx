import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

// ── Color variants ────────────────────────────────────────────
const colorMap = {
  // Status
  default:    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  primary:    'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
  secondary:  'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300',
  success:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  warning:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  error:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  info:       'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  // Semantic note/quiz statuses
  pending:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  processing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ready:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
} as const

const sizeMap = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2   py-0.5 text-xs',
  lg: 'px-2.5 py-1   text-sm',
} as const

export type BadgeColor = keyof typeof colorMap
export type BadgeSize  = keyof typeof sizeMap

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor
  size?:  BadgeSize
  /** Adds a small dot before the label */
  dot?:   boolean
}

export default function Badge({
  color = 'default',
  size  = 'md',
  dot   = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colorMap[color],
        sizeMap[size],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      )}
      {children}
    </span>
  )
}
