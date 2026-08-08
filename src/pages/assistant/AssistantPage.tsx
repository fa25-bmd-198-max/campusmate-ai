import { useRef, useEffect, useCallback } from 'react'
import { Bot, Trash2, Lightbulb, BookOpen, Clock, Target } from 'lucide-react'
import { cn } from '@/utils/cn'
import ChatMessage from '@/components/assistant/ChatMessage'
import ChatInput from '@/components/assistant/ChatInput'
import { useChatSession } from '@/hooks/useChatSession'
import { useProfile } from '@/hooks/useProfile'

// ── Suggestion chips shown when conversation is empty ─────────
const SUGGESTIONS = [
  { icon: <BookOpen className="h-4 w-4" />,  text: 'Explain a concept from my notes' },
  { icon: <Target    className="h-4 w-4" />,  text: 'Recommend revision priorities' },
  { icon: <Clock     className="h-4 w-4" />,  text: 'Help me create a study schedule' },
  { icon: <Lightbulb className="h-4 w-4" />,  text: 'Suggest study techniques for my learning style' },
]

export default function AssistantPage() {
  const { profile }   = useProfile()
  const {
    messages,
    input,
    setInput,
    sendMessage,
    retryLast,
    clearHistory,
    isStreaming,
  } = useChatSession()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (input.trim() && !isStreaming) sendMessage()
  }, [input, isStreaming, sendMessage])

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 dark:bg-secondary-900/30">
            <Bot className="h-6 w-6 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-h3 font-semibold text-gray-900 dark:text-gray-100">
              CampusMate AI
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your personal academic assistant
              {profile?.full_name && ` · Hello, ${profile.full_name.split(' ')[0]}!`}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Clear conversation history"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear chat
          </button>
        )}
      </div>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6"
        aria-live="polite"
        aria-label="Conversation"
      >
        {/* Empty state + suggestions */}
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 py-12 text-center">
            <div>
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-100 dark:bg-secondary-900/30">
                <Bot className="h-10 w-10 text-secondary-500" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-h2 font-semibold text-gray-900 dark:text-gray-100">
                What would you like to learn today?
              </h2>
              <p className="mt-2 text-body text-gray-500 dark:text-gray-400">
                I can explain concepts, answer questions, suggest study techniques,
                and help you make the most of your study sessions.
              </p>
            </div>

            {/* Suggestion chips */}
            <div className="grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => setInput(s.text)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left text-sm',
                    'text-gray-700 transition-colors',
                    'hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700',
                    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
                    'dark:hover:border-primary-700 dark:hover:bg-primary-900/20',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  )}
                >
                  <span className="shrink-0 text-primary-500 dark:text-primary-400">
                    {s.icon}
                  </span>
                  {s.text}
                </button>
              ))}
            </div>

            {/* Profile hint */}
            {!profile?.onboarding_complete && (
              <p className="text-xs text-gray-400 dark:text-gray-600">
                💡 Complete your profile for more personalised responses
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-5">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRetry={msg.role === 'error' ? retryLast : undefined}
                userAvatar={profile?.avatar_url}
                userName={profile?.full_name ?? ''}
              />
            ))}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            loading={isStreaming}
            placeholder="Ask me anything academic…"
          />
          <p className="mt-2 text-center text-[10px] text-gray-400 dark:text-gray-600">
            CampusMate AI can make mistakes. Verify important information from your course materials.
          </p>
        </div>
      </div>
    </div>
  )
}
