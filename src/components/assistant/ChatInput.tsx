import { useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Spinner } from '@/components/ui'

interface ChatInputProps {
  value:       string
  onChange:    (value: string) => void
  onSend:      () => void
  loading?:    boolean
  disabled?:   boolean
  placeholder?: string
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  loading    = false,
  disabled   = false,
  placeholder = 'Ask anything academic…',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea up to ~5 rows
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!loading && !disabled && value.trim()) onSend()
    }
  }

  const canSend = !loading && !disabled && value.trim().length > 0

  return (
    <div className="flex items-end gap-2">
      <div className="relative flex-1">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          rows={1}
          aria-label="Chat message input"
          aria-describedby="chat-send-hint"
          className={cn(
            'w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3',
            'pr-12 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:border-primary-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            'disabled:cursor-not-allowed disabled:opacity-60',
            'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
            'dark:focus:border-primary-500',
          )}
          style={{ minHeight: '48px', maxHeight: '140px' }}
        />
      </div>

      <button
        onClick={onSend}
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
          canSend
            ? 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
            : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500',
        )}
      >
        {loading
          ? <Spinner size="sm" color="white" />
          : <Send className="h-4 w-4" aria-hidden="true" />}
      </button>

      <span id="chat-send-hint" className="sr-only">
        Press Enter to send, Shift+Enter for a new line
      </span>
    </div>
  )
}
