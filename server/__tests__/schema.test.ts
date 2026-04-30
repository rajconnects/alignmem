// Schema regression tests.
//
// Lock the contract that DTP v0.1 only requires `decision.statement`.
// `decision.reasoning` is OPTIONAL (deprecated in favor of nodes[]).
// 0.3.x once made it required and rejected ~12 valid traces — these
// tests exist so that regression cannot recur silently.

import { describe, it, expect } from 'vitest'
import { decisionSchema, decisionTraceSchema } from '../schema.js'

describe('decisionSchema — DTP v0.1', () => {
  it('accepts a decision with only `statement` (DTP v0.1 minimum)', () => {
    const result = decisionSchema.safeParse({
      statement: 'Ship Apache 2.0 over BSL-1.1.'
    })
    expect(result.success).toBe(true)
  })

  it('still accepts a decision that includes legacy `reasoning`', () => {
    const result = decisionSchema.safeParse({
      statement: 'Ship Apache 2.0.',
      reasoning: 'Permissive license maximizes implementer adoption.'
    })
    expect(result.success).toBe(true)
  })

  it('rejects a decision with no statement', () => {
    const result = decisionSchema.safeParse({
      reasoning: 'Some reason but no actual decision statement.'
    })
    expect(result.success).toBe(false)
  })
})

describe('decisionTraceSchema — minimal valid DTP v0.1 trace', () => {
  // Mirrors the shape of real traces under alignmink-traces/threads/
  // (e.g. 2026-04-25-license-apache-2-over-bsl.json) that previously
  // failed to load.
  const minimal = {
    schema_version: '0.1.0',
    trace_id: '2026-04-25-license-apache-2-over-bsl',
    title: 'License switch — Apache 2.0 over BSL-1.1',
    captured_at: '2026-04-25T09:05:00Z',
    author: { name: 'Arun Raj', role: 'ceo' },
    decision: {
      statement: 'alignmink-dtp ships under Apache License 2.0; BSL-1.1 removed.'
    },
    nodes: []
  }

  it('validates without decision.reasoning', () => {
    const result = decisionTraceSchema.safeParse(minimal)
    if (!result.success) {
      // Surface the actual error path so the failure is debuggable.
      throw new Error(
        `decisionTraceSchema rejected a minimal valid trace: ${JSON.stringify(result.error.issues, null, 2)}`
      )
    }
    expect(result.success).toBe(true)
  })
})

describe('decisionTraceSchema — shorthand-shape nodes (Cowork producer regression)', () => {
  // Reproduces the Apr 30 Cowork capture bug: nodes use `type` instead
  // of `node_type` and omit author_role/author_name/sequence_order/
  // created_at. The reader normalizes them rather than rejecting.
  const shorthand = {
    schema_version: '0.1.0',
    trace_id: '2026-04-30-market-model-force-taxonomy',
    title: 'Reject Porter 5 Forces as taxonomy',
    captured_at: '2026-04-30T11:36:00Z',
    captured_via: 'cowork',
    author: { name: 'Arun Raj', role: 'ceo' },
    decision: { statement: 'Reject 5F; adopt 8-class market model.' },
    nodes: [
      {
        id: 'dn-1',
        type: 'alternative',
        content: "Use Porter's 5 Forces as the taxonomy (5 classes).",
        rejected_reason: '5F misses regulatory, macro, talent, technology platform risk.'
      },
      {
        id: 'dn-2',
        type: 'resolution',
        content: 'Adopt the 8-class market model.'
      }
    ],
    impact: 'major'
  }

  it('normalizes shorthand nodes and accepts impact: "major"', () => {
    const result = decisionTraceSchema.safeParse(shorthand)
    if (!result.success) {
      throw new Error(`rejected: ${JSON.stringify(result.error.issues, null, 2)}`)
    }
    const out = result.data
    expect(out.nodes).toHaveLength(2)
    expect(out.nodes[0].node_type).toBe('alternative')
    expect(out.nodes[0].author_role).toBe('ceo')
    expect(out.nodes[0].author_name).toBe('Arun Raj')
    expect(out.nodes[0].sequence_order).toBe(0)
    expect(out.nodes[0].created_at).toBe('2026-04-30T11:36:00Z')
    // Producer-emitted extras like rejected_reason are preserved, not dropped.
    expect((out.nodes[0] as Record<string, unknown>).rejected_reason).toContain('5F misses')
    // 'major' coerced to 'high'.
    expect(out.impact).toBe('high')
  })

  it('still accepts canonical-shape nodes unchanged', () => {
    const canonical = {
      ...shorthand,
      nodes: [
        {
          id: 'dn-1',
          node_type: 'resolution',
          author_role: 'ceo',
          author_name: 'Arun Raj',
          content: 'Adopt the 8-class market model.',
          sequence_order: 1,
          created_at: '2026-04-30T11:36:00Z'
        }
      ]
    }
    const result = decisionTraceSchema.safeParse(canonical)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.nodes[0].node_type).toBe('resolution')
      expect(result.data.nodes[0].sequence_order).toBe(1)
    }
  })
})
