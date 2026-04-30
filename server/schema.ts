import { z } from 'zod'

// Zod schema for the canonical DecisionTrace JSON files.
//
// The reader recognizes two trace shapes natively and one as a
// permissive fallback:
//
//   1. DTP v0.1  — the canonical Alignmink Decision Trace Protocol.
//                  See PROTOCOL.md. trace_id, title, decision.{statement,
//                  reasoning, alternatives}, themes, revisit_triggers,
//                  impact, attachments, etc.
//
//   2. Engine    — legacy nested-nodes shape from pre-v0.1 captures.
//                  topic, nodes[], resolution_summary, revisit_trigger.
//                  Kept first-class so existing user data renders.
//
//   3. Document  — human-written decision documents. Identified by
//                  presence of `date` and absence of nodes/decision.
//                  Read permissively; rendered with available fields.
//
// Validation happens at the filesystem boundary: any .json file in
// <project>/alignmink-traces/threads/ that fails this schema is
// reported to stderr and excluded from the indexer without crashing.

export const traceStatusSchema = z.enum(['open', 'resolved', 'contested', 'archived', 'deferred', 'stale', 'superseded'])

// Open string — node-type vocabulary evolves. The reader's job is to
// render, not to gate-keep evolving decision vocabulary.
export const nodeTypeSchema = z.string()

// Open string to accommodate 15+ roles including war_cabinet_priya, etc.
export const authorRoleSchema = z.string()

export const traceNodeEntitiesSchema = z.object({
  people: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
  projects: z.array(z.string()).optional(),
  timeframes: z.array(z.string()).optional()
})

export const traceNodeSchema = z.object({
  id: z.string(),
  node_type: nodeTypeSchema,
  author_role: authorRoleSchema,
  author_name: z.string(),
  content: z.string(),
  context: z.object({
    source: z.string().default(''),
    session: z.string().default(''),
    related_topics: z.array(z.string()).default([]),
    related_docs: z.array(z.string()).optional(),
    pulse_week: z.string().nullable().optional(),
    trigger: z.string().nullable().optional()
  }).default({ source: '', session: '', related_topics: [] }),
  sequence_order: z.number(),
  created_at: z.string(),
  embedding: z.unknown().optional(),
  entities: traceNodeEntitiesSchema.optional()
}).passthrough()

export const traceEdgeSchema = z.object({
  id: z.string().optional(),
  type: z.string().optional(),
  source_thread_id: z.string().optional(),
  target_trace_id: z.string().optional(),
  target_thread_id: z.string().optional(),
  edge_type: z.string().optional(),
  rationale: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  created_at: z.string().optional()
}).passthrough()

// ── DTP v0.1 sub-schemas ─────────────────────────────────

export const authorSchema = z.object({
  name: z.string().min(1),
  role: z.string(),
  id: z.string().optional()
}).passthrough()

export const decisionAlternativeSchema = z.object({
  option: z.string().min(1),
  rejected_because: z.string().min(1)
}).passthrough()

// DTP v0.1: only `statement` is required on `decision`. `reasoning` and
// `alternatives` are kept readable for legacy traces but are NOT required —
// the canonical reasoning surface is `nodes[]`. See schema/dtp-v0.1.json
// description on `decision` and PROTOCOL.md §5.8.
export const decisionSchema = z.object({
  statement: z.string().min(1),
  reasoning: z.string().min(1).optional(),
  alternatives: z.array(decisionAlternativeSchema).default([])
}).passthrough()

export const attachmentSchema = z.object({
  kind: z.enum(['url', 'file_path', 'inline_text']),
  value: z.string().min(1),
  description: z.string().optional()
}).passthrough()

export const outcomeSchema = z.object({
  observed_at: z.string().nullable().optional(),
  observation: z.string().nullable().optional(),
  success: z.boolean().nullable().optional()
}).passthrough()

// ── Top-level trace schema ───────────────────────────────

const rawTraceSchema = z.object({
  // Identity — DTP uses trace_id+title; legacy uses id+topic. Either pair
  // is acceptable; transform normalizes downstream.
  id: z.string().optional(),
  trace_id: z.string().optional(),
  topic: z.string().optional(),
  title: z.string().optional(),

  // Lifecycle
  status: traceStatusSchema.optional(),
  thread_status: traceStatusSchema.optional(),

  // Categorization (legacy + DTP)
  category: z.string().optional(),
  decision_category: z.string().optional(),
  project: z.string().optional().default(''),
  themes: z.array(z.string()).optional(),

  // Engine-shape fields (all optional — DTP traces don't carry these)
  session_id: z.string().optional().default(''),
  skill: z.string().optional(),
  company_id: z.unknown().optional(),
  cycle_id: z.unknown().optional(),
  spine_priority_id: z.unknown().optional(),
  opened_at: z.string().optional(),
  resolved_at: z.string().nullable().default(null),
  resolution_summary: z.string().nullable().default(null),
  revisit_trigger: z.string().nullable().default(null),
  outcome: z.union([z.string(), outcomeSchema, z.null()]).default(null),
  outcome_assessed_at: z.string().nullable().default(null),
  captured_at: z.string().optional(),
  captured_via: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Document-style trace timestamp
  date: z.string().optional(),
  // Permissive at the raw layer — shorthand-shape nodes (e.g. captures
  // from a stale Cowork instructions block that emit `type` instead of
  // `node_type` and omit author_role/author_name) are normalized into
  // canonical shape inside decisionTraceSchema.transform below. This is
  // "be liberal in what you accept" applied at the trace boundary so
  // legacy or producer-side bugs never silently lose decisions.
  nodes: z.array(z.object({}).passthrough()).optional().default([]),
  edges: z.array(traceEdgeSchema).optional(),

  // DTP v0.1 fields — first-class so they typecheck and render.
  schema_version: z.string().optional(),
  author: authorSchema.optional(),
  decision: decisionSchema.optional(),
  revisit_triggers: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  // Spec enum is low|medium|high|critical. Producers occasionally emit
  // 'major' (a common synonym from PMs / strategy decks); we coerce it
  // to 'high' rather than reject the trace.
  impact: z.union([
    z.enum(['low', 'medium', 'high', 'critical']),
    z.literal('major').transform(() => 'high' as const)
  ]).optional(),
  attachments: z.array(attachmentSchema).optional(),
  content_hash: z.string().optional(),
  thread_id: z.string().optional(),
  extensions: z.record(z.unknown()).optional()
}).passthrough().refine(
  (data) => Boolean(data.id || data.trace_id),
  { message: 'either id or trace_id is required' }
).refine(
  (data) => Boolean(data.topic || data.title || data.decision?.statement),
  { message: 'either topic, title, or decision.statement is required' }
)

// Normalize a single permissive-shape node into the canonical
// traceNodeSchema shape. Pulls author_role/author_name from the
// trace-level author when missing, defaults sequence_order to array
// index, and falls back to captured_at for created_at. Aliases the
// shorthand `type` key to canonical `node_type`. Pre-canonical
// captures (e.g. from older Cowork instructions blocks that emitted
// `type/content/rejected_reason`) load without being re-captured.
function normalizeNode(
  raw: Record<string, unknown>,
  idx: number,
  fallback: { author_name: string; author_role: string; created_at: string }
) {
  const node = raw as Record<string, unknown>
  return {
    id: typeof node.id === 'string' ? node.id : `dn-${idx + 1}`,
    node_type:
      typeof node.node_type === 'string'
        ? node.node_type
        : typeof node.type === 'string'
          ? (node.type as string)
          : 'note',
    author_role:
      typeof node.author_role === 'string' ? node.author_role : fallback.author_role,
    author_name:
      typeof node.author_name === 'string' ? node.author_name : fallback.author_name,
    content: typeof node.content === 'string' ? node.content : '',
    context:
      node.context && typeof node.context === 'object'
        ? node.context
        : { source: '', session: '', related_topics: [] },
    sequence_order:
      typeof node.sequence_order === 'number' ? node.sequence_order : idx,
    created_at:
      typeof node.created_at === 'string' ? node.created_at : fallback.created_at,
    // Preserve any extra producer-emitted fields (rejected_reason,
    // entities, embedding, etc.) so nothing is dropped on import.
    ...node
  }
}

export const decisionTraceSchema = rawTraceSchema.transform((data) => {
  const id = data.id ?? data.trace_id!
  const trace_id = data.trace_id ?? data.id!
  const topic = data.topic ?? data.title ?? data.decision?.statement ?? '(untitled)'
  const title = data.title ?? data.topic ?? data.decision?.statement ?? '(untitled)'
  const captured_at =
    data.captured_at ??
    data.created_at ??
    data.opened_at ??
    data.date ??
    new Date().toISOString()
  const opened_at =
    data.opened_at ?? data.date ?? data.created_at ?? data.captured_at ?? captured_at

  const fallback = {
    author_name: data.author?.name ?? 'unknown',
    author_role: data.author?.role ?? 'unknown',
    created_at: captured_at
  }
  // Normalize permissive input then re-parse through the strict node
  // schema. This guarantees consumers (indexer, derive, etc.) see the
  // canonical typed shape regardless of producer-side shorthand.
  const normalizedNodes = (data.nodes ?? []).map((n, idx) =>
    normalizeNode(n as Record<string, unknown>, idx, fallback)
  )
  const nodes = z.array(traceNodeSchema).parse(normalizedNodes)

  return {
    ...data,
    id,
    trace_id,
    topic,
    title,
    status: data.status ?? data.thread_status ?? 'open' as const,
    category: data.category ?? data.decision_category ?? '',
    captured_at,
    opened_at,
    nodes,
  }
})

export type DecisionTraceSchema = z.output<typeof decisionTraceSchema>

// Request body schemas for API endpoints
export const loginBodySchema = z.object({ passcode: z.string().min(1) })
export const setupBodySchema = z.object({ passcode: z.string().min(6) })
export const projectBodySchema = z.object({ path: z.string().min(1) })
