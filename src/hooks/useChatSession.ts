import { useState, useCallback, useRef } from 'react'
import { streamChatMessage, Prompts } from '@/services/ai'
import type { ChatTurn } from '@/services/ai'
import type { ChatMessage, ChatContext } from '@/types/ai.types'
import { useProfile } from './useProfile'
import { useCourses } from './useProfile'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

/**
 * useChatSession
 *
 * Manages the full lifecycle of an AI chat conversation:
 * - Builds a context-aware system prompt from the student profile
 * - Maintains a local message history (session-scoped, not persisted)
 * - Passes the last 10 turns to every Gemini request for context
 * - Streams responses token-by-token into the latest assistant bubble
 * - Handles retry on error
 *
 * @param noteContext  Optional context injected when opened from a note page
 */
export function useChatSession(noteContext?: ChatContext) {
  const { profile }          = useProfile()
  const { data: courses = [] } = useCourses()

  const [messages,   setMessages]    = useState<ChatMessage[]>([])
  const [input,      setInput]       = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  // Keep a ref to the last user message for retry
  const lastUserMsgRef = useRef<string>('')

  // ── System prompt ─────────────────────────────────────────
  const buildSystemPrompt = useCallback((): string => {
    const courseNames = courses.map((c) => c.name)
    return Prompts.academicAssistant(
      {
        full_name:      profile?.full_name ?? null,
        degree:         profile?.degree,
        university:     profile?.university,
        semester:       profile?.semester,
        courses:        courseNames,
        learning_style: profile?.learning_style,
        weak_subjects:  profile?.weak_subjects,
      },
      noteContext?.noteTitle
        ? { title: noteContext.noteTitle, content: noteContext.noteContent ?? '' }
        : undefined,
    )
  }, [profile, courses, noteContext])

  // ── Convert local messages → Gemini history format ─────────
  const buildHistory = useCallback(
    (msgs: ChatMessage[]): ChatTurn[] => {
      // Only include user/assistant turns (not error bubbles)
      // and only the last 10 turns (= 5 exchanges)
      const validMsgs = msgs
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)

      return validMsgs.map((m) => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }))
    },
    [],
  )

  // ── Core send function ────────────────────────────────────
  const doSend = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isStreaming) return

      lastUserMsgRef.current = userText

      // Add user bubble
      const userMsg: ChatMessage = {
        id:        makeId(),
        role:      'user',
        content:   userText,
        timestamp: Date.now(),
      }

      // Add streaming assistant bubble (empty until chunks arrive)
      const assistantId = makeId()
      const assistantMsg: ChatMessage = {
        id:        assistantId,
        role:      'assistant',
        content:   '',
        streaming: true,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setIsStreaming(true)

      try {
        const systemPrompt = buildSystemPrompt()
        // Build history from messages BEFORE adding the new user message
        // (the new user message is sent as the `userMessage` arg, not in history)
        const history = buildHistory(
          messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
        )

        let accumulated = ''

        await streamChatMessage(
          systemPrompt,
          history,
          userText,
          (chunk) => {
            accumulated += chunk
            // Update the streaming bubble in place
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulated }
                  : m,
              ),
            )
          },
        )

        // Mark streaming done
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        )
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred.'

        // Replace the streaming bubble with an error bubble
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  role:      'error' as const,
                  content:   errorMsg,
                  streaming: false,
                }
              : m,
          ),
        )
      } finally {
        setIsStreaming(false)
      }
    },
    [isStreaming, messages, buildSystemPrompt, buildHistory],
  )

  // ── Public API ────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    doSend(input)
  }, [input, doSend])

  const retryLast = useCallback(() => {
    if (!lastUserMsgRef.current) return
    // Remove the last error bubble, then resend
    setMessages((prev) => prev.filter((m) => m.role !== 'error'))
    doSend(lastUserMsgRef.current)
  }, [doSend])

  const clearHistory = useCallback(() => {
    setMessages([])
    setInput('')
    lastUserMsgRef.current = ''
  }, [])

  return {
    messages,
    input,
    setInput,
    sendMessage,
    retryLast,
    clearHistory,
    isStreaming,
  }
}
