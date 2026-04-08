import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { bucketFor, derive, indexProject } from '../indexer.js'
import { importAllTraces } from '../storage.js'
import type { DecisionTraceSchema } from '../schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// The repo ships with sample traces; point the tests at the real folder
// so we exercise actual schema data from production decision capture.
const REAL_PROJECT = path.resolve(__dirname, '..', '..', '..', 'samples')
const REAL_PROJECT_NAME = path.basename(REAL_PROJECT)

let testHome: string

beforeAll(async () => {
  testHome = await fs.mkdtemp(path.join(os.tmpdir(), 'alignmem-indexer-test-'))
  process.env.ALIGNMEM_HOME = testHome
  // Pre-import the sample traces into the local store so indexProject can read them.
  await importAllTraces(REAL_PROJECT, REAL_PROJECT_NAME)
})

afterAll(async () => {
  if (testHome) {
    await fs.rm(testHome, { recursive: true, force: true })
  }
  delete process.env.ALIGNMEM_HOME
})

const baseTrace: DecisionTraceSchema = {
  id: 'dt-test',
  topic: 'Test topic',
  status: 'resolved',
  category: 'product_scope',
  project: 'Alignmink',
  session_id: 'sess-1',
  opened_at: '2026-03-01T00:00:00Z',
  resolved_at: '2026-03-05T00:00:00Z',
  resolution_summary: 'ok',
  revisit_trigger: null,
  outcome: null,
  outcome_assessed_at: null,
  captured_at: '2026-03-05T00:00:00Z',
  nodes: [
    {
      id: 'n1',
      node_type: 'intent',
      author_role: 'founder',
      author_name: 'Arun',
      content: 'a',
      context: { source: 'conversation', session: 'x', related_topics: ['alpha'] },
      sequence_order: 1,
      created_at: '2026-03-01T00:00:00Z'
    },
    {
      id: 'n2',
      node_type: 'response',
      author_role: 'advisor',
      author_name: 'Claude',
      content: 'b',
      context: { source: 'conversation', session: 'x', related_topics: ['beta'] },
      sequence_order: 2,
      created_at: '2026-03-02T00:00:00Z'
    }
  ]
}

describe('derive()', () => {
  it('computes participants, turn_count, duration_days, topic_tags', () => {
    const now = new Date('2026-03-06T00:00:00Z')
    const d = derive(baseTrace, 'test.json', now)
    expect(d.participants).toEqual(['Arun', 'Claude'])
    expect(d.turn_count).toBe(2)
    expect(d.duration_days).toBe(4)
    expect(d.topic_tags).toEqual(['product_scope', 'alpha', 'beta'])
    expect(d.file_name).toBe('test.json')
    expect(d.age_bucket).toBe('7d')
  })

  it('returns null duration for open traces', () => {
    const open = { ...baseTrace, resolved_at: null }
    const d = derive(open, 'x.json')
    expect(d.duration_days).toBeNull()
  })

  it('deduplicates related_topics in topic_tags', () => {
    const repeated = {
      ...baseTrace,
      nodes: baseTrace.nodes.map((n) => ({
        ...n,
        context: { ...n.context, related_topics: ['alpha', 'alpha'] }
      }))
    }
    const d = derive(repeated, 'y.json')
    expect(d.topic_tags.filter((t) => t === 'alpha')).toHaveLength(1)
  })
})

describe('bucketFor()', () => {
  const captured = new Date('2026-04-01T00:00:00Z')
  it.each([
    [0, '7d'],
    [7, '7d'],
    [8, '14d'],
    [14, '14d'],
    [15, '30d'],
    [30, '30d'],
    [31, 'older'],
    [365, 'older']
  ])('days=%s → %s', (days, expected) => {
    const now = new Date(captured.getTime() + days * 24 * 60 * 60 * 1000)
    expect(bucketFor(captured, now)).toBe(expected)
  })
})

describe('indexProject()', () => {
  it('reads the real sample corpus without crashing', async () => {
    const result = await indexProject(REAL_PROJECT, REAL_PROJECT_NAME)
    // There is at least one valid trace in the repo
    expect(result.traces.length).toBeGreaterThan(0)
    // Every trace has derived fields populated
    for (const trace of result.traces) {
      expect(trace.file_name).toMatch(/\.json$/)
      expect(trace.turn_count).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(trace.participants)).toBe(true)
      expect(Array.isArray(trace.topic_tags)).toBe(true)
    }
    // Newest first
    for (let i = 1; i < result.traces.length; i++) {
      const prev = new Date(result.traces[i - 1].captured_at).getTime()
      const cur = new Date(result.traces[i].captured_at).getTime()
      expect(prev).toBeGreaterThanOrEqual(cur)
    }
  })

  it('returns an empty result (with an error) for a missing project name', async () => {
    const result = await indexProject('', 'nonexistent-project-xyz')
    expect(result.traces).toEqual([])
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
