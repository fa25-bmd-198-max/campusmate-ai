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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F5F0EB' }}>

      <DesktopSidebar />

      <MobileDrawer
        open={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavDrawerOpen(true)} />

        <main
          id="main-content"
          className={cn('flex-1 overflow-y-auto', 'pb-16 lg:pb-0')}
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

      <ChatDrawer
        open={chatDrawerOpen}
        onClose={() => setChatDrawerOpen(false)}
      />

      {/* Floating AI assistant button */}
      <button
        onClick={() => setChatDrawerOpen((v) => !v)}
        aria-label={chatDrawerOpen ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={chatDrawerOpen}
        className={cn(
          'fixed bottom-20 right-5 z-40 lg:bottom-6',
          'flex h-14 w-14 items-center justify-center rounded-full',
          'shadow-lg transition-all duration-200',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
          'hover:scale-105 active:scale-95',
          chatDrawerOpen
            ? 'bg-surface-700 text-white hover:bg-surface-800'
            : 'text-white hover:opacity-90',
        )}
        style={chatDrawerOpen ? undefined : { backgroundColor: '#3c0000' }}
      >
        <Bot className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  )
}
