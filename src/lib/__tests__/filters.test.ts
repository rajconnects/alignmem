import { describe, expect, it } from 'vitest'
import type { IndexedTrace } from '../types'
import {
  applyAll,
  applyLens,
  applySearch,
  applyStatusFilter,
  collaboratorCounts,
  timeCounts,
  topicCounts
} from '../filters'

function makeTrace(partial: Partial<IndexedTrace>): IndexedTrace {
  const id = partial.id ?? 'dt-1'
  const topic = partial.topic ?? 'Topic'
  return {
    id,
    trace_id: partial.trace_id ?? id,
    topic,
    title: partial.title ?? topic,
    status: partial.status ?? 'resolved',
    category: partial.category ?? 'product_scope',
    project: 'P',
    session_id: 'sess',
    opened_at: '2026-04-01T00:00:00Z',
    resolved_at: '2026-04-01T00:00:00Z',
    resolution_summary: partial.resolution_summary ?? null,
    revisit_trigger: null,
    outcome: null,
    outcome_assessed_at: null,
    captured_at: '2026-04-01T00:00:00Z',
    nodes: [],
    participants: partial.participants ?? ['Arun'],
    turn_count: partial.turn_count ?? 1,
    duration_days: 0,
    age_bucket: partial.age_bucket ?? '7d',
    topic_tags: partial.topic_tags ?? [partial.category ?? 'product_scope'],
    file_name: partial.file_name ?? 'x.json'
  } as IndexedTrace
}

const corpus: IndexedTrace[] = [
  makeTrace({ id: '1', status: 'resolved', topic: 'Roadmap lock', topic_tags: ['product_scope'], participants: ['Arun', 'Claude'] }),
  makeTrace({ id: '2', status: 'open', topic: 'Pricing v3', topic_tags: ['pricing'], age_bucket: '14d', participants: ['Arun'] }),
  makeTrace({ id: '3', status: 'contested', topic: 'GTM split', resolution_summary: 'Open positioning', topic_tags: ['positioning', 'product_scope'], age_bucket: '30d', participants: ['Arun', 'Board'] }),
  makeTrace({ id: '4', status: 'archived', topic: 'OpenClaw parked', topic_tags: ['integrations'], age_bucket: 'older', participants: ['Arun', 'Claude'] })
]

describe('applyStatusFilter', () => {
  it('returns all when status is all', () => {
    expect(applyStatusFilter(corpus, 'all')).toHaveLength(4)
  })
  it('filters by specific status', () => {
    expect(applyStatusFilter(corpus, 'resolved').map((t) => t.id)).toEqual(['1'])
    expect(applyStatusFilter(corpus, 'contested').map((t) => t.id)).toEqual(['3'])
  })
})

describe('applySearch', () => {
  it('matches topic substring', () => {
    expect(applySearch(corpus, 'roadmap').map((t) => t.id)).toEqual(['1'])
  })
  it('matches resolution summary substring', () => {
    expect(applySearch(corpus, 'positioning').map((t) => t.id)).toEqual(['3'])
  })
  it('is case insensitive', () => {
    expect(applySearch(corpus, 'PRICING').map((t) => t.id)).toEqual(['2'])
  })
  it('returns full list when empty query', () => {
    expect(applySearch(corpus, '').length).toBe(corpus.length)
  })
})

describe('applyLens', () => {
  it('filters by topic tag', () => {
    expect(applyLens(corpus, { kind: 'topic', value: 'product_scope' }).map((t) => t.id)).toEqual(['1', '3'])
  })
  it('filters by collaborator', () => {
    expect(applyLens(corpus, { kind: 'collaborator', value: 'Board' }).map((t) => t.id)).toEqual(['3'])
  })
  it('filters by time bucket', () => {
    expect(applyLens(corpus, { kind: 'time', value: '14d' }).map((t) => t.id)).toEqual(['2'])
  })
  it('no lens returns all', () => {
    expect(applyLens(corpus, null)).toHaveLength(4)
  })
})

describe('applyAll', () => {
  it('chains status + lens + search', () => {
    const result = applyAll(corpus, {
      status: 'all',
      lens: { kind: 'topic', value: 'product_scope' },
      query: 'gtm'
    })
    expect(result.map((t) => t.id)).toEqual(['3'])
  })
})

describe('lens counts', () => {
  it('topicCounts ordered desc', () => {
    const counts = topicCounts(corpus)
    expect(counts[0].value).toBe('product_scope')
    expect(counts[0].count).toBe(2)
  })
  it('collaboratorCounts', () => {
    const counts = collaboratorCounts(corpus)
    const arun = counts.find((c) => c.value === 'Arun')
    expect(arun?.count).toBe(4)
  })
  it('timeCounts always returns 4 buckets', () => {
    const counts = timeCounts(corpus)
    expect(counts.map((c) => c.value)).toEqual(['7d', '14d', '30d', 'older'])
  })
})
