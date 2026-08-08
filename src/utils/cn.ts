import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind class names, resolving conflicts intelligently.
 * Use instead of template literals wherever conditional classes are needed.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
