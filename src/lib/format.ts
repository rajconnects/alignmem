import type { IndexedTrace, TraceStatus } from './types'

// Presentation helpers — pure, no React imports, easy to unit test.

export const SIGNAL_CHARS: Record<TraceStatus, string> = {
  resolved: '+',
  open: '○', // ○
  contested: '✕', // ✕
  archived: '—', // —
  deferred: '⋯', // ⋯
  stale: '—', // —
  superseded: '→' // →
}

export function signalFor(status: TraceStatus): string {
  return SIGNAL_CHARS[status] ?? '·'
}

export function statusColorVar(status: TraceStatus): string {
  switch (status) {
    case 'resolved':
      return 'var(--green)'
    case 'open':
      return 'var(--orange)'
    case 'contested':
      return 'var(--red)'
    case 'archived':
    case 'deferred':
    case 'stale':
    case 'superseded':
      return 'var(--text-300)'
    default:
      return 'var(--text-300)'
  }
}

// Formats a captured_at ISO string as "APR 5" / "MAR 30 2025".
export function formatCapturedShort(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'UNKNOWN'
  const now = new Date()
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
  const day = date.getUTCDate()
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? `${month} ${day}`
    : `${month} ${day} ${date.getUTCFullYear()}`
}

export function formatIsoDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(0, 10)
}

export function durationLabel(duration_days: number | null): string {
  if (duration_days == null) return 'OPEN'
  if (duration_days === 0) return 'SAME-DAY'
  if (duration_days === 1) return '1 DAY'
  return `${duration_days} DAYS`
}

export function buildCardMetaLine(trace: IndexedTrace): string {
  const captured = formatCapturedShort(trace.captured_at)
  const duration = durationLabel(trace.duration_days)
  const turns = `${trace.turn_count} TURN${trace.turn_count === 1 ? '' : 'S'}`
  const participants =
    trace.participants.length > 0
      ? trace.participants.map((p) => p.toUpperCase()).join(' · ')
      : '—'
  return `${captured} · ${duration} · ${turns} · ${participants}`
}

export function sortNodesBySequence<T extends { sequence_order: number }>(nodes: readonly T[]): T[] {
  return [...nodes].sort((a, b) => a.sequence_order - b.sequence_order)
}
