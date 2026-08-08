import { useEffect, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import Button from './Button'

const sizeMap = {
  sm:   'max-w-sm',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-full mx-4',
} as const

export type ModalSize = keyof typeof sizeMap

export interface ModalProps {
  /** Whether the modal is visible */
  open:         boolean
  /** Called when the modal should close (Escape, overlay click, or close button) */
  onClose:      () => void
  /** Modal heading — used for aria-labelledby */
  title?:       string
  /** Content rendered below the title */
  description?: string
  children:     ReactNode
  /** Footer content (usually action buttons) */
  footer?:      ReactNode
  size?:        ModalSize
  /** Prevent closing on overlay click */
  persistent?:  boolean
  className?:   string
}

// Focusable selectors for the focus trap
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size      = 'md',
  persistent = false,
  className,
}: ModalProps) {
  const panelRef    = useRef<HTMLDivElement>(null)
  const previousRef = useRef<HTMLElement | null>(null)
  const titleId     = 'modal-title'
  const descId      = 'modal-desc'

  // Store the element that triggered the modal so we can restore focus
  useEffect(() => {
    if (open) {
      previousRef.current = document.activeElement as HTMLElement
    } else if (previousRef.current) {
      previousRef.current.focus()
    }
  }, [open])

  // Auto-focus the first focusable element when opened
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      el?.focus()
    })
    return () => cancelAnimationFrame(frame)
  }, [open])

  // Focus trap: cycle Tab/Shift+Tab within the panel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && !persistent) { onClose(); return }
      if (e.key !== 'Tab') return

      const focusables = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      )
      if (focusables.length === 0) return

      const first = focusables[0]
      const last  = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    },
    [onClose, persistent],
  )

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        /* Backdrop */
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descId : undefined}
          onKeyDown={handleKeyDown}
          onClick={(e) => { if (e.target === e.currentTarget && !persistent) onClose() }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

          {/* Panel */}
          <motion.div
            key="modal-panel"
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0,   scale: 0.95,  y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 w-full rounded-2xl',
              'bg-white shadow-modal dark:bg-gray-900',
              'border border-gray-200 dark:border-gray-800',
              'flex flex-col max-h-[90vh]',
              sizeMap[size],
              className,
            )}
            tabIndex={-1}
          >
            {/* Header */}
            {(title || !persistent) && (
              <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                <div>
                  {title && (
                    <h2 id={titleId} className="text-h3 font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="mt-1 text-body text-gray-500 dark:text-gray-400">
                      {description}
                    </p>
                  )}
                </div>
                {!persistent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Close modal"
                    className="shrink-0 rounded-lg p-1.5"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="shrink-0 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
