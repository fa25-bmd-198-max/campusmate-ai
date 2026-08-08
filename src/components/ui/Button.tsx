import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import Spinner from './Spinner'

// ── Variant maps ──────────────────────────────────────────────

const variantMap = {
  primary:   'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 shadow-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700',
  ghost:     'text-gray-700 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  link:      'text-primary-600 underline-offset-4 hover:underline dark:text-primary-400 p-0 h-auto',
} as const

const sizeMap = {
  sm: 'h-8  px-3   text-xs  gap-1.5',
  md: 'h-10 px-4   text-sm  gap-2',
  lg: 'h-11 px-5   text-base gap-2',
} as const

export type ButtonVariant = keyof typeof variantMap
export type ButtonSize    = keyof typeof sizeMap

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:     ButtonVariant
  size?:        ButtonSize
  loading?:     boolean
  /** Renders an icon to the left of the label */
  leftIcon?:    React.ReactNode
  /** Renders an icon to the right of the label */
  rightIcon?:   React.ReactNode
  /** Makes the button fill its container width */
  fullWidth?:   boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = 'primary',
      size      = 'md',
      loading   = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        className={cn(
          // Base
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variant + size
          variantMap[variant],
          variant !== 'link' && sizeMap[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size="sm" color="current" aria-hidden="true" />
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {leftIcon  && <span aria-hidden="true" className="shrink-0">{leftIcon}</span>}
            {children  && <span>{children}</span>}
            {rightIcon && <span aria-hidden="true" className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  },
)

Button.displayName = 'Button'
export default Button
