import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Bell, Sun, Moon, Menu, ChevronDown,
  UserCircle, Settings, LogOut,
  BookOpen, Users, CalendarDays, Zap, Clock, CheckCheck,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar, Badge } from '@/components/ui'
import { useTheme } from '@/context/ThemeContext'
import { useNotificationContext } from '@/context/NotificationContext'
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { formatRelativeTime } from '@/utils/formatters'
import toast from 'react-hot-toast'
import type { NotificationRow, NotificationType } from '@/types/database.types'

interface TopbarProps { onMenuClick: () => void }

function NotifIcon({ type }: { type: NotificationType }) {
  const cls = 'h-4 w-4 shrink-0'
  switch (type) {
    case 'study_reminder':     return <Clock        className={cn(cls, 'text-blue-500')}   />
    case 'group_invite':       return <Users        className={cn(cls, 'text-purple-500')} />
    case 'deadline':           return <CalendarDays className={cn(cls, 'text-orange-500')} />
    case 'exam_reminder':      return <BookOpen     className={cn(cls, 'text-red-700')}    />
    case 'ai_rec':             return <Zap          className={cn(cls, 'text-emerald-600')}/>
    case 'connection_request': return <Users        className={cn(cls, 'text-slate-500')}  />
    default:                   return <Bell         className={cn(cls, 'text-slate-400')}  />
  }
}

function NotifRow({ notif, onRead }: { notif: NotificationRow; onRead: (id: string, link: string | null) => void }) {
  return (
    <button type="button" onClick={() => onRead(notif.id, notif.link)}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
        'hover:bg-stone-50 focus:outline-none focus-visible:bg-stone-50',
        !notif.read && 'bg-red-50/40',
      )}>
      <span className="mt-0.5 shrink-0"><NotifIcon type={notif.type} /></span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug text-slate-800', !notif.read && 'font-medium')}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{notif.message}</p>
        )}
        <p className="mt-1 text-[10px] text-slate-400">{formatRelativeTime(notif.created_at)}</p>
      </div>
      {!notif.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: '#3c0000' }} aria-label="Unread" />
      )}
    </button>
  )
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead    = useMarkRead()
  const markAllRead = useMarkAllRead()
  const navigate    = useNavigate()
  const visible     = notifications.slice(0, 15)
  const hasUnread   = visible.some((n) => !n.read)

  const handleRead = useCallback(async (id: string, link: string | null) => {
    await markRead.mutateAsync(id)
    if (link) { onClose(); navigate(link) }
  }, [markRead, navigate, onClose])

  return (
    <div role="region" aria-label="Notifications"
      className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border bg-white shadow-modal animate-fade-in overflow-hidden"
      style={{ borderColor: '#ddd6cc' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f0ebe3' }}>
        <p className="text-sm font-semibold" style={{ color: '#36454f' }}>Notifications</p>
        {hasUnread && (
          <button onClick={() => markAllRead.mutateAsync()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: '#3c0000' }}>
            <CheckCheck className="h-3.5 w-3.5" />Mark all read
          </button>
        )}
      </div>
      <div className="max-h-[420px] overflow-y-auto" role="list">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell className="h-8 w-8 text-stone-300" />
            <p className="text-sm text-stone-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {visible.map((n) => <NotifRow key={n.id} notif={n} onRead={handleRead} />)}
          </div>
        )}
      </div>
      {visible.length > 0 && (
        <div className="px-4 py-2.5" style={{ borderTop: '1px solid #f0ebe3' }}>
          <p className="text-center text-xs text-stone-400">Showing last {visible.length} notifications</p>
        </div>
      )}
    </div>
  )
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const { unreadCount }                = useNotificationContext()
  const { signOut }                    = useAuth()
  const { profile }                    = useProfile()
  const navigate                       = useNavigate()

  const [searchValue,  setSearchValue]  = useState('')
  const [notifOpen,    setNotifOpen]    = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const notifRef    = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchValue.trim()
    if (q) { navigate(`/search?q=${encodeURIComponent(q)}`); setSearchValue('') }
  }

  useEffect(() => {
    if (!notifOpen) return
    const h = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [notifOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    const h = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [dropdownOpen])

  const handleSignOut = async () => {
    setDropdownOpen(false)
    const { error } = await signOut()
    if (error) toast.error('Could not sign out. Please try again.')
    else       navigate('/login', { replace: true })
  }

  const iconBtn = 'rounded-lg p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-900/40'

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 lg:px-6"
            style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e8e1d8' }}>
      {/* Mobile menu */}
      <button onClick={onMenuClick} aria-label="Open navigation menu"
        className={cn(iconBtn, 'lg:hidden')}
        style={{ color: '#36454f' }}>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} role="search" className="flex flex-1 items-center lg:max-w-md">
        <label htmlFor="global-search" className="sr-only">Search</label>
        <div className="relative w-full">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </span>
          <input id="global-search" type="search" value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border py-2 pl-9 pr-4 text-sm transition-colors focus:outline-none focus-visible:ring-2"
            style={{
              borderColor: '#ddd6cc',
              backgroundColor: '#faf8f5',
              color: '#36454f',
              outline: 'none',
            }}
          />
        </div>
      </form>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={iconBtn}
          style={{ color: '#36454f' }}>
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen((v) => !v); setDropdownOpen(false) }}
            aria-expanded={notifOpen} aria-haspopup="true"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className={cn(iconBtn, 'relative')}
            style={{ color: '#36454f' }}>
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: '#3c0000' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotificationDropdown onClose={() => setNotifOpen(false)} />}
        </div>

        {/* User dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button onClick={() => { setDropdownOpen((v) => !v); setNotifOpen(false) }}
            aria-expanded={dropdownOpen} aria-haspopup="menu" aria-label="User menu"
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors focus:outline-none hover:bg-stone-100">
            <Avatar src={profile?.avatar_url} name={profile?.full_name ?? ''} size="sm" />
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', dropdownOpen && 'rotate-180')}
                         style={{ color: '#36454f' }} aria-hidden="true" />
          </button>

          {dropdownOpen && (
            <div role="menu" aria-label="User menu"
              className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border bg-white py-1 shadow-modal animate-fade-in"
              style={{ borderColor: '#ddd6cc' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #f0ebe3' }}>
                <p className="truncate text-sm font-medium" style={{ color: '#36454f' }}>{profile?.full_name || 'Student'}</p>
                <p className="truncate text-xs text-stone-400">{profile?.university || 'University'}</p>
              </div>
              <div className="py-1">
                <DropdownItem icon={<UserCircle className="h-4 w-4" />} label="View profile" onClick={() => { setDropdownOpen(false); navigate('/profile') }} />
                <DropdownItem icon={<Settings   className="h-4 w-4" />} label="Settings"     onClick={() => { setDropdownOpen(false); navigate('/settings') }} />
              </div>
              <div className="py-1" style={{ borderTop: '1px solid #f0ebe3' }}>
                <DropdownItem icon={<LogOut className="h-4 w-4" />} label="Sign out" onClick={handleSignOut} danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function DropdownItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button role="menuitem" onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors focus:outline-none',
        danger ? 'text-red-700 hover:bg-red-50' : 'hover:bg-stone-50',
      )}
      style={danger ? undefined : { color: '#36454f' }}>
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}
