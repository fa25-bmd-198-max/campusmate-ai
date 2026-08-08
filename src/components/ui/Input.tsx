import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label rendered above the input */
  label?:      string
  /** Error message shown below the input in red */
  error?:      string
  /** Helper text shown below the input in gray */
  helperText?: string
  /** Icon or element rendered inside the left edge of the input */
  leftIcon?:   ReactNode
  /** Icon or element rendered inside the right edge of the input */
  rightIcon?:  ReactNode
  /** Extra class applied to the outer wrapper div */
  wrapperClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      wrapperClassName,
      className,
      id,
      ...props
    },
    ref,
  ) => {
    const autoId     = useId()
    const inputId    = id ?? autoId
    const errorId    = `${inputId}-error`
    const helperId   = `${inputId}-helper`
    const hasError   = !!error
    const describedBy = [
      hasError   ? errorId  : '',
      helperText ? helperId : '',
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {props.required && (
              <span className="ml-1 text-red-500" aria-hidden="true">*</span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            className={cn(
              // Base
              'block w-full rounded-lg border bg-white py-2 text-sm text-gray-900',
              'placeholder:text-gray-400',
              'transition-colors duration-150',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-0',
              // Dark
              'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-600',
              // Padding — adjust for icons
              leftIcon  ? 'pl-9' : 'pl-3',
              rightIcon ? 'pr-9' : 'pr-3',
              // State
              hasError
                ? 'border-red-500 focus-visible:ring-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800',
              className,
            )}
            {...props}
          />

          {rightIcon && (
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500">
              {rightIcon}
            </span>
          )}
        </div>

        {/* Error message */}
        {hasError && (
          <p id={errorId} role="alert" className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}

        {/* Helper text */}
        {!hasError && helperText && (
          <p id={helperId} className="text-xs text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
