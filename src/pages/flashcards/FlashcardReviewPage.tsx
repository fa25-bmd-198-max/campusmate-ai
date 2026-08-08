import { useState, useCallback, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, RotateCcw, CheckCircle,
  XCircle, Trophy, Layers, RefreshCw,
} from 'lucide-react'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { EmptyState } from '@/components/shared'
import { useFlashcardSet, useFlashcards, useUpdateMastery, useResetMastery } from '@/hooks/useFlashcards'
import { cn } from '@/utils/cn'
import { pluralize } from '@/utils/formatters'
import type { FlashcardRow } from '@/types/flashcard.types'

// ── Flip card ─────────────────────────────────────────────────
function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card:    FlashcardRow
  flipped: boolean
  onFlip:  () => void
}) {
  return (
    <div
      className="relative h-64 w-full cursor-pointer select-none"
      onClick={onFlip}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip() } }}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={flipped ? `Answer: ${card.answer}` : `Question: ${card.question}. Press to reveal answer.`}
      style={{ perspective: '1200px' }}
    >
      {/* Card container — rotates on flip */}
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
        style={{ transformStyle: 'preserve-3d' }}
        className="absolute inset-0"
      >
        {/* Front face — Question */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-8 text-center',
            'bg-white shadow-card dark:bg-gray-900',
            'border-gray-200 dark:border-gray-700',
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {card.topic && (
            <Badge color="primary" size="sm" className="mb-4">
              {card.topic}
            </Badge>
          )}
          <p className="text-lg font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {card.question}
          </p>
          <p className="mt-4 text-xs text-gray-400 dark:text-gray-600">
            Click to reveal answer
          </p>
        </div>

        {/* Back face — Answer */}
        <div
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center rounded-2xl border p-8 text-center',
            'bg-primary-50 shadow-card dark:bg-primary-950',
            'border-primary-200 dark:border-primary-800',
          )}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-lg font-semibold leading-snug text-primary-900 dark:text-primary-100">
            {card.answer}
          </p>
          <p className="mt-4 text-xs text-primary-400 dark:text-primary-600">
            How well did you know this?
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// ── Session summary screen ────────────────────────────────────
function SessionSummary({
  total,
  masteredCount,
  onRestart,
  onReview,
  onBack,
}: {
  total:         number
  masteredCount: number
  onRestart:     () => void
  onReview:      () => void
  onBack:        () => void
}) {
  const pct = total > 0 ? Math.round((masteredCount / total) * 100) : 0
  const needsReview = total - masteredCount

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <Trophy className="h-10 w-10 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      </span>

      <div>
        <h2 className="text-h2 font-semibold text-gray-900 dark:text-gray-100">
          Review complete!
        </h2>
        <p className="mt-1 text-body text-gray-500 dark:text-gray-400">
          You reviewed {pluralize(total, 'card')}
        </p>
      </div>

      {/* Stats */}
      <div className="flex w-full max-w-xs gap-4">
        <div className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{masteredCount}</p>
          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-500">Mastered</p>
        </div>
        <div className="flex-1 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{needsReview}</p>
          <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-500">Needs review</p>
        </div>
        <div className="flex-1 rounded-xl border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">{pct}%</p>
          <p className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-500">Score</p>
        </div>
      </div>

      {/* Score message */}
      <p className="max-w-xs text-sm text-gray-600 dark:text-gray-400">
        {pct >= 80
          ? '🎉 Outstanding! You know this material well.'
          : pct >= 60
          ? '👍 Good progress! Keep reviewing the remaining cards.'
          : '📚 Keep at it — regular review will improve your retention.'}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        {needsReview > 0 && (
          <Button onClick={onReview} leftIcon={<RotateCcw className="h-4 w-4" />}>
            Review {pluralize(needsReview, 'card')} again
          </Button>
        )}
        <Button variant="secondary" onClick={onRestart} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Restart full deck
        </Button>
        <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to sets
        </Button>
      </div>
    </div>
  )
}

// ── Main review page ──────────────────────────────────────────
export default function FlashcardReviewPage() {
  const { setId }  = useParams<{ setId: string }>()
  const navigate   = useNavigate()

  const { data: set,   isLoading: setLoading  } = useFlashcardSet(setId)
  const { data: cards = [], isLoading: cardsLoading } = useFlashcards(setId)

  const updateMastery = useUpdateMastery(setId ?? '')
  const resetMastery  = useResetMastery(setId  ?? '')

  // ── Review queue: only unmastered cards by default ────────
  const [showAll,   setShowAll]   = useState(false)
  const [finished,  setFinished]  = useState(false)

  const reviewQueue = useMemo(
    () => (showAll ? cards : cards.filter((c) => !c.mastered)),
    [cards, showAll],
  )

  const [index,   setIndex]   = useState(0)
  const [flipped, setFlipped] = useState(false)

  const currentCard = reviewQueue[index] as FlashcardRow | undefined

  // Counts
  const masteredCount  = cards.filter((c) => c.mastered).length
  const totalCount     = cards.length

  // ── Navigation ────────────────────────────────────────────
  const goNext = useCallback(() => {
    setFlipped(false)
    if (index + 1 >= reviewQueue.length) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }, [index, reviewQueue.length])

  const goPrev = useCallback(() => {
    if (index > 0) {
      setFlipped(false)
      setIndex((i) => i - 1)
    }
  }, [index])

  // ── Mastery actions ───────────────────────────────────────
  const markMastered = useCallback(async () => {
    if (!currentCard) return
    await updateMastery.mutateAsync({ cardId: currentCard.id, mastered: true })
    goNext()
  }, [currentCard, updateMastery, goNext])

  const markNeedsReview = useCallback(async () => {
    if (!currentCard) return
    await updateMastery.mutateAsync({ cardId: currentCard.id, mastered: false })
    goNext()
  }, [currentCard, updateMastery, goNext])

  // ── Reset / restart ───────────────────────────────────────
  const handleRestart = useCallback(async () => {
    await resetMastery.mutateAsync()
    setIndex(0)
    setFlipped(false)
    setFinished(false)
    setShowAll(true)
  }, [resetMastery])

  const handleReviewFailed = useCallback(() => {
    setShowAll(false)
    setIndex(0)
    setFlipped(false)
    setFinished(false)
  }, [])

  // ── Keyboard shortcuts ─────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (finished || !currentCard) return
      if (e.key === 'ArrowRight' || e.key === 'l') goNext()
      if (e.key === 'ArrowLeft'  || e.key === 'h') goPrev()
      if (e.key === ' ' || e.key === 'Enter')       { e.preventDefault(); setFlipped((f) => !f) }
      if (e.key === '1') markMastered()
      if (e.key === '2') markNeedsReview()
    },
    [finished, currentCard, goNext, goPrev, markMastered, markNeedsReview],
  )

  // ── Loading ───────────────────────────────────────────────
  if (setLoading || cardsLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Skeleton.Line className="h-8 w-48" />
        <Skeleton.Block className="h-64" />
        <Skeleton.Line className="h-10 w-full" />
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────
  if (!set || cards.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="Flashcard set not found"
          description="This set may have been deleted."
          action={<Button variant="secondary" onClick={() => navigate('/flashcards')}>Back to sets</Button>}
        />
      </div>
    )
  }

  // ── All mastered / session done ───────────────────────────
  if (finished || reviewQueue.length === 0) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Link
          to="/flashcards"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Flashcards
        </Link>
        <Card>
          <SessionSummary
            total={totalCount}
            masteredCount={masteredCount}
            onRestart={handleRestart}
            onReview={handleReviewFailed}
            onBack={() => navigate('/flashcards')}
          />
        </Card>
      </div>
    )
  }

  // ── Review UI ─────────────────────────────────────────────
  return (
    <div
      className="mx-auto flex max-w-2xl flex-col gap-6 p-6"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/flashcards"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sets
        </Link>
        <div className="flex items-center gap-2">
          {set.subject && <Badge color="primary" size="sm">{set.subject}</Badge>}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {masteredCount}/{totalCount} mastered
          </span>
          <button
            onClick={handleRestart}
            aria-label="Reset all mastery"
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Set title */}
      <h1 className="text-h2 font-semibold text-gray-900 dark:text-gray-100 truncate">
        {set.title}
      </h1>

      {/* Progress bar */}
      <div aria-label={`Card ${index + 1} of ${reviewQueue.length}`}>
        <div className="mb-1.5 flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Card {index + 1} of {reviewQueue.length}</span>
          <span>{reviewQueue.length - index - 1} remaining</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-primary-600 transition-all duration-300"
            style={{ width: `${((index + 1) / reviewQueue.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flip card */}
      <AnimatePresence mode="wait">
        {currentCard && (
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
          >
            <FlipCard
              card={currentCard}
              flipped={flipped}
              onFlip={() => setFlipped((f) => !f)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons — shown after flip */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={markNeedsReview}
              loading={updateMastery.isPending}
              leftIcon={<XCircle className="h-5 w-5 text-amber-500" />}
              className="border-amber-200 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
            >
              Needs review
            </Button>
            <Button
              size="lg"
              fullWidth
              onClick={markMastered}
              loading={updateMastery.isPending}
              leftIcon={<CheckCircle className="h-5 w-5" />}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Mastered
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation arrows (always visible) */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={index === 0}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Previous
        </Button>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300"
        >
          {flipped ? 'Hide answer' : 'Show answer'}
        </button>

        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Skip
        </Button>
      </div>

      {/* Keyboard shortcuts hint */}
      <p className="text-center text-[10px] text-gray-400 dark:text-gray-600">
        Keyboard: <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">Space</kbd> flip ·{' '}
        <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">1</kbd> mastered ·{' '}
        <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">2</kbd> needs review ·{' '}
        <kbd className="rounded bg-gray-100 px-1 dark:bg-gray-800">←/→</kbd> navigate
      </p>
    </div>
  )
}
