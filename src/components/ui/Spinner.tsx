import { cn } from '@/utils/cn'

const sizeMap = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-6 w-6 border-2',
  xl: 'h-8 w-8 border-[3px]',
} as const

const colorMap = {
  current: 'text-current',
  primary: 'text-primary-600 dark:text-primary-400',
  white:   'text-white',
  muted:   'text-gray-400',
} as const

export type SpinnerSize  = keyof typeof sizeMap
export type SpinnerColor = keyof typeof colorMap

interface SpinnerProps {
  size?:      SpinnerSize
  color?:     SpinnerColor
  className?: string
  label?:     string
}

export default function Spinner({
  size      = 'md',
  color     = 'current',
  className,
  label     = 'Loading…',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        sizeMap[size],
        colorMap[color],
        className,
      )}
    />
  )
}
