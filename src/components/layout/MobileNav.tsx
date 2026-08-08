import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Bot,
  FileText,
  UsersRound,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// Five most-used destinations (design.md §1.5.4)
interface Tab {
  label: string
  to:    string
  icon:  React.ElementType
  end?:  boolean
}

const TABS: Tab[] = [
  { label: 'Home',      to: '/dashboard',  icon: LayoutDashboard, end: true },
  { label: 'Assistant', to: '/assistant',  icon: Bot },
  { label: 'Notes',     to: '/notes',      icon: FileText },
  { label: 'Groups',    to: '/groups',     icon: UsersRound },
  { label: 'Analytics', to: '/analytics',  icon: BarChart3 },
]

/**
 * Bottom tab bar shown on screens below 768px.
 * Hidden on lg+ breakpoint.
 */
export default function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex" role="list">
        {TABS.map(({ label, to, icon: Icon, end }) => (
          <li key={to} className="flex-1" role="listitem">
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-transform duration-150',
                      isActive && 'scale-110',
                    )}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
