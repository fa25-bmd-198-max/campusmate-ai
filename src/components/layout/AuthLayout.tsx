import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AuthLayoutProps {
  children:    ReactNode
  /** Shown below the logo */
  title:       string
  /** Shown below the title */
  subtitle?:   string
  /** Max width of the card — defaults to sm (384px) */
  maxWidth?:   'xs' | 'sm' | 'md'
}

const widthMap = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
}

export default function AuthLayout({
  children,
  title,
  subtitle,
  maxWidth = 'sm',
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
      {/* Decorative top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-400" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className={cn('w-full', widthMap[maxWidth])}>

          {/* Logo */}
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg"
            aria-label="CampusMate AI home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              CampusMate <span className="text-primary-600 dark:text-primary-400">AI</span>
            </span>
          </Link>

          {/* Card */}
          <div className="rounded-2xl border border-gray-200 bg-white px-8 py-8 shadow-card dark:border-gray-800 dark:bg-gray-900">
            {/* Heading */}
            <div className="mb-6 text-center">
              <h1 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 text-body text-gray-500 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>

            {children}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-caption text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} CampusMate AI. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
