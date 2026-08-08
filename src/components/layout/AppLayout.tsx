import { useState, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { cn } from '@/utils/cn'
import { DesktopSidebar, MobileDrawer } from './Sidebar'
import Topbar from './Topbar'
import MobileNav from './MobileNav'
import ChatDrawer from '@/components/assistant/ChatDrawer'
import PageLoader from '@/components/shared/PageLoader'
import ErrorBoundary from '@/components/shared/ErrorBoundary'

export default function AppLayout() {
  const [navDrawerOpen,  setNavDrawerOpen]  = useState(false)
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      {/* ── Desktop sidebar ────────────────────────────────────── */}
      <DesktopSidebar />

      {/* ── Mobile nav drawer ──────────────────────────────────── */}
      <MobileDrawer
        open={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
      />

      {/* ── Main content column ────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        <Topbar onMenuClick={() => setNavDrawerOpen(true)} />

        <main
          id="main-content"
          className={cn(
            'flex-1 overflow-y-auto',
            'pb-16 lg:pb-0',
          )}
          tabIndex={-1}
          aria-label="Main content"
        >
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <MobileNav />
      </div>

      {/* ── AI chat drawer (persists across routes) ─────────────── */}
      <ChatDrawer
        open={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
      />

      {/* ── Floating AI assistant button ───────────────────────── */}
      <button
        onClick={() => setChatDrawerOpen((v) => !v)}
        aria-label={chatDrawerOpen ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={chatDrawerOpen}
        className={cn(
          'fixed bottom-20 right-5 z-40 lg:bottom-6',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'shadow-lg transition-all duration-200',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950',
          'hover:scale-105 active:scale-95',
          chatDrawerOpen
            ? 'bg-gray-700 text-white hover:bg-gray-800'
            : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        )}
      >
        <Bot className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  )
}
