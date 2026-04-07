import type { IndexedTrace, LensSelection, StatusFilter } from './types'

// Filtering + lens counting — pure functions for trivial unit tests.

export function applyStatusFilter(
  traces: readonly IndexedTrace[],
  status: StatusFilter
): IndexedTrace[] {
  if (status === 'all') return [...traces]
  return traces.filter((t) => t.status === status)
}

export function applySearch(traces: readonly IndexedTrace[], query: string): IndexedTrace[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...traces]
  return traces.filter((t) => {
    const summary = t.resolution_summary?.toLowerCase() ?? ''
    return t.topic.toLowerCase().includes(q) || summary.includes(q)
  })
}

export function applyLens(traces: readonly IndexedTrace[], lens: LensSelection | null): IndexedTrace[] {
  if (!lens) return [...traces]
  if (lens.kind === 'topic') {
    return traces.filter((t) => t.topic_tags.includes(lens.value))
  }
  if (lens.kind === 'collaborator') {
    return traces.filter((t) => t.participants.includes(lens.value))
  }
  // time lens
  return traces.filter((t) => t.age_bucket === lens.value)
}

export function applyAll(
  traces: readonly IndexedTrace[],
  filters: { status: StatusFilter; query: string; lens: LensSelection | null }
): IndexedTrace[] {
  return applySearch(applyLens(applyStatusFilter(traces, filters.status), filters.lens), filters.query)
}

// ── Lens counts ─────────────────────────────────────────
export function topicCounts(traces: readonly IndexedTrace[]): Array<{ value: string; count: number }> {
  const map = new Map<string, number>()
  for (const t of traces) {
    for (const tag of t.topic_tags) {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export function collaboratorCounts(traces: readonly IndexedTrace[]): Array<{ value: string; count: number }> {
  const map = new Map<string, number>()
  for (const t of traces) {
    for (const p of t.participants) {
      map.set(p, (map.get(p) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export function timeCounts(traces: readonly IndexedTrace[]): Array<{ value: string; count: number; label: string }> {
  const buckets: Array<{ value: '7d' | '14d' | '30d' | 'older'; label: string }> = [
    { value: '7d', label: 'LAST 7d' },
    { value: '14d', label: 'LAST 14d' },
    { value: '30d', label: 'LAST 30d' },
    { value: 'older', label: 'OLDER' }
  ]
  return buckets.map((b) => ({
    value: b.value,
    label: b.label,
    count: traces.filter((t) => t.age_bucket === b.value).length
  }))
}
