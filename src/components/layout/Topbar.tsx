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

interface TopbarProps {
  onMenuClick: () => void
}

// ── Notification type → icon + colour ────────────────────────
function NotifIcon({ type }: { type: NotificationType }) {
  const classes = 'h-4 w-4 shrink-0'
  switch (type) {
    case 'study_reminder':     return <Clock          className={cn(classes, 'text-blue-500')}   />
    case 'group_invite':       return <Users          className={cn(classes, 'text-purple-500')} />
    case 'deadline':           return <CalendarDays   className={cn(classes, 'text-orange-500')} />
    case 'exam_reminder':      return <BookOpen       className={cn(classes, 'text-red-500')}    />
    case 'ai_rec':             return <Zap            className={cn(classes, 'text-emerald-500')}/>
    case 'connection_request': return <Users          className={cn(classes, 'text-primary-500')}/>
    default:                   return <Bell           className={cn(classes, 'text-gray-400')}   />
  }
}

// ── Single notification row ───────────────────────────────────
function NotifRow({
  notif,
  onRead,
}: {
  notif:  NotificationRow
  onRead: (id: string, link: string | null) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onRead(notif.id, notif.link)}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        'focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800',
        !notif.read && 'bg-primary-50/60 dark:bg-primary-900/10',
      )}
    >
      {/* Type icon */}
      <span className="mt-0.5 shrink-0">
        <NotifIcon type={notif.type} />
      </span>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm leading-snug text-gray-800 dark:text-gray-200',
          !notif.read && 'font-medium',
        )}>
          {notif.title}
        </p>
        {notif.message && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
            {notif.message}
          </p>
        )}
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-600">
          {formatRelativeTime(notif.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500" aria-label="Unread" />
      )}
    </button>
  )
}

// ── Notification dropdown ─────────────────────────────────────
function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { data: notifications = [], isLoading } = useNotifications()
  const markRead    = useMarkRead()
  const markAllRead = useMarkAllRead()
  const navigate    = useNavigate()

  // Show at most 15 notifications per spec
  const visible = notifications.slice(0, 15)
  const hasUnread = visible.some((n) => !n.read)

  const handleRead = useCallback(async (id: string, link: string | null) => {
    await markRead.mutateAsync(id)
    if (link) {
      onClose()
      navigate(link)
    }
  }, [markRead, navigate, onClose])

  const handleMarkAll = async () => {
    await markAllRead.mutateAsync()
  }

  return (
    <div
      role="region"
      aria-label="Notifications"
      className={cn(
        'absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200',
        'bg-white shadow-modal',
        'dark:border-gray-700 dark:bg-gray-900',
        'animate-fade-in overflow-hidden',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</p>
        {hasUnread && (
          <button
            onClick={handleMarkAll}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[420px] overflow-y-auto" role="list">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Bell className="h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {visible.map((n) => (
              <NotifRow key={n.id} notif={n} onRead={handleRead} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {visible.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400 dark:text-gray-600">
            Showing last {visible.length} notifications
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Topbar ───────────────────────────────────────────────
export default function Topbar({ onMenuClick }: TopbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const { unreadCount }                = useNotificationContext()
  const { signOut }                    = useAuth()
  const { profile }                    = useProfile()
  const navigate                       = useNavigate()

  // ── Search ──────────────────────────────────────────────────
  const [searchValue, setSearchValue] = useState('')
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchValue.trim()
    if (q) { navigate(`/search?q=${encodeURIComponent(q)}`); setSearchValue('') }
  }

  // ── Notification dropdown ─────────────────────────────────
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setNotifOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [notifOpen])

  // ── User dropdown ────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [dropdownOpen])

  const handleSignOut = async () => {
    setDropdownOpen(false)
    const { error } = await signOut()
    if (error) { toast.error('Could not sign out. Please try again.') }
    else        { navigate('/login', { replace: true }) }
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
      {/* Mobile menu button */}
      <button onClick={onMenuClick} aria-label="Open navigation menu"
        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {/* Global search */}
      <form onSubmit={handleSearch} role="search" className="flex flex-1 items-center lg:max-w-md">
        <label htmlFor="global-search" className="sr-only">Search students, groups, notes, flashcards</label>
        <div className="relative w-full">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500">
            <Search className="h-4 w-4" aria-hidden="true" />
          </span>
          <input id="global-search" type="search" value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search…"
            className={cn(
              'w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-9 pr-4 text-sm',
              'text-gray-900 placeholder:text-gray-400 transition-colors duration-150',
              'focus:border-primary-400 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-500 dark:focus:bg-gray-900',
            )} />
        </div>
      </form>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1">

        {/* Theme toggle */}
        <button onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* ── Notifications bell + dropdown ───────────────── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((v) => !v); setDropdownOpen(false) }}
            aria-expanded={notifOpen}
            aria-haspopup="true"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <Badge color="error" size="sm"
                className="absolute -right-0.5 -top-0.5 min-w-[18px] justify-center px-1 py-0"
                aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>

          {notifOpen && (
            <NotificationDropdown onClose={() => setNotifOpen(false)} />
          )}
        </div>

        {/* User avatar dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button onClick={() => { setDropdownOpen((v) => !v); setNotifOpen(false) }}
            aria-expanded={dropdownOpen} aria-haspopup="menu" aria-label="User menu"
            className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800">
            <Avatar src={profile?.avatar_url} name={profile?.full_name ?? ''} size="sm" />
            <ChevronDown className={cn('h-3.5 w-3.5 text-gray-400 transition-transform duration-200 dark:text-gray-500', dropdownOpen && 'rotate-180')} aria-hidden="true" />
          </button>

          {dropdownOpen && (
            <div role="menu" aria-label="User menu"
              className={cn('absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-modal dark:border-gray-700 dark:bg-gray-900 animate-fade-in')}>
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{profile?.full_name || 'Student'}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{profile?.university || 'University'}</p>
              </div>
              <div className="py-1">
                <DropdownItem icon={<UserCircle className="h-4 w-4" />} label="View profile" onClick={() => { setDropdownOpen(false); navigate('/profile') }} />
                <DropdownItem icon={<Settings   className="h-4 w-4" />} label="Settings"     onClick={() => { setDropdownOpen(false); navigate('/settings') }} />
              </div>
              <div className="border-t border-gray-100 py-1 dark:border-gray-800">
                <DropdownItem icon={<LogOut className="h-4 w-4" />} label="Sign out" onClick={handleSignOut} danger />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Dropdown item ─────────────────────────────────────────────
function DropdownItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button role="menuitem" onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors duration-100',
        'focus:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800',
        danger ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
               : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800',
      )}>
      <span className="shrink-0" aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}
