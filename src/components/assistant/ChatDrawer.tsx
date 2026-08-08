import { useRef, useEffect, useCallback } from 'react'
import { X, Bot, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { useChatSession } from '@/hooks/useChatSession'
import type { ChatContext } from '@/types/ai.types'

interface ChatDrawerProps {
  open:        boolean
  onClose:     () => void
  context?:    ChatContext     // optional note context injected from NoteDetailPage
}

export default function ChatDrawer({ open, onClose, context }: ChatDrawerProps) {
  const {
    messages,
    input,
    setInput,
    sendMessage,
    retryLast,
    clearHistory,
    isStreaming,
  } = useChatSession(context)

  const messagesEndRef  = useRef<HTMLDivElement>(null)
  const inputRef        = useRef<HTMLInputElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      // Short delay to allow animation to complete
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleSend = useCallback(() => {
    if (input.trim() && !isStreaming) sendMessage()
  }, [input, isStreaming, sendMessage])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only on mobile */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            key="chat-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 right-0 top-0 z-50 flex flex-col',
              'w-full max-w-[420px]',
              'bg-gray-50 shadow-2xl dark:bg-gray-950',
              'border-l border-gray-200 dark:border-gray-800',
            )}
            role="dialog"
            aria-modal="true"
            aria-label="AI academic assistant"
          >
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary-100 dark:bg-secondary-900/30">
                  <Bot className="h-5 w-5 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    CampusMate AI
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {context?.noteTitle
                      ? `Context: ${context.noteTitle}`
                      : 'Academic assistant'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    aria-label="Clear conversation"
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close assistant"
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* ── Messages ────────────────────────────────────────── */}
            <div
              className="flex-1 space-y-4 overflow-y-auto p-4"
              aria-live="polite"
              aria-label="Conversation"
            >
              {/* Empty state */}
              {messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-100 dark:bg-secondary-900/30">
                    <Bot className="h-8 w-8 text-secondary-500" aria-hidden="true" />
                  </span>
                  <div className="max-w-xs space-y-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      How can I help you study?
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Ask me to explain concepts, suggest study techniques, or help you understand your notes.
                    </p>
                  </div>

                  {/* Quick-start suggestions */}
                  <div className="mt-2 flex flex-col gap-2 w-full max-w-xs">
                    {[
                      'Explain this concept simply',
                      'Suggest a study plan for this week',
                      'What should I focus on for exams?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setInput(suggestion); }}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-primary-700 dark:hover:bg-primary-900/20"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onRetry={msg.role === 'error' ? retryLast : undefined}
                />
              ))}

              <div ref={messagesEndRef} aria-hidden="true" />
            </div>

            {/* ── Input ───────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                loading={isStreaming}
                placeholder={
                  context?.noteTitle
                    ? `Ask about "${context.noteTitle}"…`
                    : 'Ask anything academic…'
                }
              />
              <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
                AI can make mistakes. Always verify important academic information.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
