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
