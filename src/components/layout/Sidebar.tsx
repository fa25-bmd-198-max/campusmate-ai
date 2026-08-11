import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Bot, FileText, Layers, ClipboardList,
  Calendar, CalendarClock, Users, UsersRound, Hammer,
  BarChart3, Settings, UserCircle, GraduationCap, X, LogOut, Info,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import toast from 'react-hot-toast'

interface NavItem  { label: string; to: string; icon: React.ReactNode }
interface NavGroup { label: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    label: 'Learning',
    items: [
      { label: 'AI Assistant',  to: '/assistant',  icon: <Bot           className="h-4 w-4" /> },
      { label: 'Notes',         to: '/notes',      icon: <FileText      className="h-4 w-4" /> },
      { label: 'Flashcards',    to: '/flashcards', icon: <Layers        className="h-4 w-4" /> },
      { label: 'Quizzes',       to: '/quiz',       icon: <ClipboardList className="h-4 w-4" /> },
      { label: 'Study Planner', to: '/planner',    icon: <Calendar      className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Collaborate',
    items: [
      { label: 'Study Groups',  to: '/groups',   icon: <UsersRound className="h-4 w-4" /> },
      { label: 'Project Teams', to: '/teams',    icon: <Hammer     className="h-4 w-4" /> },
      { label: 'Find Partners', to: '/matching', icon: <Users      className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Organize',
    items: [
      { label: 'Calendar',    to: '/calendar',    icon: <CalendarClock className="h-4 w-4" /> },
      { label: 'Assignments', to: '/assignments', icon: <FileText      className="h-4 w-4" /> },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Analytics', to: '/analytics', icon: <BarChart3 className="h-4 w-4" /> }],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile',  to: '/profile',  icon: <UserCircle className="h-4 w-4" /> },
      { label: 'Settings', to: '/settings', icon: <Settings   className="h-4 w-4" /> },
      { label: 'About',    to: '/about',    icon: <Info       className="h-4 w-4" /> },
    ],
  },
]

function SidebarNavItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      end={item.to === '/dashboard'}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900/50',
          isActive
            ? 'text-white shadow-sm'
            : 'text-slate-300 hover:bg-white/10 hover:text-white',
        )
      }
      style={({ isActive }) => isActive ? { backgroundColor: '#3c0000' } : undefined}
    >
      <span className="shrink-0">{item.icon}</span>
      {item.label}
    </NavLink>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { signOut } = useAuth()
  const { profile } = useProfile()
  const navigate    = useNavigate()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) toast.error('Could not sign out. Please try again.')
    else       navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: '#36454f' }}>
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: '#3c0000' }}>
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="text-base font-bold tracking-tight text-white">
          CampusMate <span style={{ color: '#f5a0a0' }}>AI</span>
        </span>
        {onClose && (
          <button onClick={onClose} aria-label="Close navigation"
            className="ml-auto rounded-md p-1 text-slate-400 hover:text-white focus:outline-none">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <ul className="space-y-5" role="list">
          {NAV_GROUPS.map((group) => (
            <li key={group.label} role="listitem">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest"
                 style={{ color: 'rgba(255,255,255,0.35)' }}>
                {group.label}
              </p>
              <ul className="space-y-0.5" role="list">
                {group.items.map((item) => (
                  <li key={item.to} role="listitem">
                    <SidebarNavItem item={item} onClick={onClose} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* User footer */}
      <div className="shrink-0 p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar src={profile?.avatar_url} name={profile?.full_name ?? ''} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {profile?.full_name || 'Student'}
            </p>
            <p className="truncate text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {profile?.university || 'University'}
            </p>
          </div>
          <button onClick={handleSignOut} aria-label="Sign out"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-red-300 focus:outline-none transition-colors">
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 lg:flex lg:flex-col"
           style={{ backgroundColor: '#36454f', borderRight: '1px solid rgba(255,255,255,0.06)' }}
           aria-label="Desktop sidebar">
      <SidebarContent />
    </aside>
  )
}

interface MobileDrawerProps { open: boolean; onClose: () => void }

export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden"
           aria-hidden="true" onClick={onClose} />
      <aside className="fixed inset-y-0 left-0 z-50 w-72 shadow-2xl lg:hidden"
             style={{ backgroundColor: '#36454f' }}
             aria-label="Mobile navigation drawer" role="dialog" aria-modal="true">
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  )
}

export default DesktopSidebar
