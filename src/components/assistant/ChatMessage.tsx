import { memo } from 'react'
import { Bot, User, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ChatMessage as ChatMsg } from '@/types/ai.types'

// ── Markdown-lite renderer ────────────────────────────────────
// Renders **bold**, `code`, and newlines without a full markdown lib.
function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const lines = text.split('\n')

  lines.forEach((line, li) => {
    // Split on **bold** and `code`
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    const rendered = parts.map((part, pi) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pi}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pi} className="rounded bg-gray-200/80 px-1 py-0.5 text-xs font-mono dark:bg-gray-700/80">
            {part.slice(1, -1)}
          </code>
        )
      }
      return part
    })
    nodes.push(<span key={li}>{rendered}</span>)
    if (li < lines.length - 1) nodes.push(<br key={`br-${li}`} />)
  })

  return nodes
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1" aria-label="AI is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500"
          style={{
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── ChatMessage ───────────────────────────────────────────────
interface ChatMessageProps {
  message:     ChatMsg
  onRetry?:    () => void
  userAvatar?: string | null   // reserved for future use (e.g. profile photo in bubble)
  userName?:   string          // reserved for future use
}

const ChatMessage = memo(function ChatMessage({
  message,
  onRetry,
  // userAvatar and userName reserved for future profile photo support
}: ChatMessageProps) {
  const isUser      = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isError     = message.role === 'error'

  return (
    <div
      className={cn(
        'flex w-full gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
      role="article"
      aria-label={`${isUser ? 'Your' : 'AI'} message`}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {isUser ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/40">
            <User className="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
          </span>
        ) : (
          <span className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            isError
              ? 'bg-red-100 dark:bg-red-900/30'
              : 'bg-secondary-100 dark:bg-secondary-900/30',
          )}>
            {isError
              ? <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
              : <Bot className="h-4 w-4 text-secondary-600 dark:text-secondary-400" aria-hidden="true" />}
          </span>
        )}
      </div>

      {/* Bubble */}
      <div className={cn('flex max-w-[78%] flex-col gap-1', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-sm bg-primary-600 text-white'
              : isError
              ? 'rounded-tl-sm border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
              : 'rounded-tl-sm bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700',
          )}
        >
          {/* Streaming typing indicator */}
          {isAssistant && message.streaming && !message.content ? (
            <TypingIndicator />
          ) : (
            <p aria-live={isAssistant ? 'polite' : undefined}>
              {renderMarkdown(message.content)}
              {/* Blinking cursor while streaming */}
              {isAssistant && message.streaming && (
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle"
                  aria-hidden="true"
                />
              )}
            </p>
          )}
        </div>

        {/* Error retry button */}
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-medium text-red-600 underline underline-offset-2 hover:text-red-500 dark:text-red-400"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
})

export default ChatMessage
