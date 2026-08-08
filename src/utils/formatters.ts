// ── Date formatting ───────────────────────────────────────────

export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    ...options,
  })
}

export function formatRelativeTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return formatDate(dateStr)
}

export function daysUntil(dateStr: string): number {
  const now    = new Date(); now.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000)
}

// ── Number formatting ─────────────────────────────────────────

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// ── String formatting ─────────────────────────────────────────

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function pluralize(count: number, word: string, plural?: string): string {
  return count === 1 ? `${count} ${word}` : `${count} ${plural ?? word + 's'}`
}

// ── Score formatting ──────────────────────────────────────────

export function scoreToPercent(score: number, total: number): number {
  return total > 0 ? Math.round((score / total) * 100) : 0
}

export function scoreColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
