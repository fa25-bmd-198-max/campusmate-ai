import { memo } from 'react'
import { Bot, User, AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ChatMessage as ChatMsg } from '@/types/ai.types'

// ── Markdown renderer ─────────────────────────────────────────
// Handles headings (###), bullet lists (* / -), bold (**), inline code (`)
// and newlines — without adding a full markdown library.
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // ── Heading: ### or ####
    if (/^#{1,4}\s/.test(line)) {
      const level = (line.match(/^#+/) ?? [''])[0].length
      const content = line.replace(/^#+\s*/, '')
      const cls = level <= 2
        ? 'text-sm font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1'
        : 'text-sm font-semibold text-gray-800 dark:text-gray-200 mt-2 mb-0.5'
      elements.push(<p key={i} className={cls}>{inlineMarkdown(content)}</p>)
      i++
      continue
    }

    // ── Bullet list: lines starting with * or -
    if (/^[\*\-]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[\*\-]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[\*\-]\s*/, ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-1 space-y-1 pl-4 list-disc">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">{inlineMarkdown(item)}</li>
          ))}
        </ul>
      )
      continue
    }

    // ── Numbered list: lines starting with 1. 2. etc.
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s*/, ''))
        i++
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-1 space-y-1 pl-4 list-decimal">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">{inlineMarkdown(item)}</li>
          ))}
        </ol>
      )
      continue
    }

    // ── Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />)
      i++
      continue
    }

    // ── Normal paragraph line
    elements.push(
      <p key={i} className="text-sm leading-relaxed">{inlineMarkdown(line)}</p>
    )
    i++
  }

  return <>{elements}</>
}

// Inline markdown: **bold**, *italic*, `code`
function inlineMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-gray-200/80 px-1 py-0.5 text-xs font-mono dark:bg-gray-700/80">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
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
            <div aria-live={isAssistant ? 'polite' : undefined}>
              {renderMarkdown(message.content)}
              {/* Blinking cursor while streaming */}
              {isAssistant && message.streaming && (
                <span
                  className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle"
                  aria-hidden="true"
                />
              )}
            </div>
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
