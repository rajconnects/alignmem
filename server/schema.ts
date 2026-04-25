import { z } from 'zod'

// Zod schema for the canonical DecisionTrace JSON files.
// Validation happens at the filesystem boundary: any .json file in
// <project>/alignmink-traces/threads/ that fails this schema is
// reported to stderr and excluded from the indexer without crashing.

export const traceStatusSchema = z.enum(['open', 'resolved', 'contested', 'archived', 'deferred', 'stale'])

// Open string to accommodate node-type vocabulary that evolves over
// time. Real traces use values beyond the original five (intent /
// response / question / resolution / dissent) — including 'decision',
// 'problem', 'analysis', 'challenge', 'reframe', 'implementation'.
// The reader's job is to render, not to gate-keep decision vocabulary.
// Enums forced by this schema previously rejected ~10 valid traces.
export const nodeTypeSchema = z.string()

// Open string to accommodate 15+ roles including war_cabinet_priya, war_cabinet_marcus, etc.
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
    // Production traces may use these alternate field names
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
  id: z.string(),
  source_thread_id: z.string().optional(),
  target_thread_id: z.string(),
  edge_type: z.string(),
  rationale: z.string().optional(),
  description: z.string().optional(),
  created_at: z.string().optional()
}).passthrough()

// Accept both field name conventions:
//   Engine spec:  status, category, session_id, opened_at, nodes[]
//   Supabase/DB:  thread_status, decision_category
//   Document style (human-written): date, resolution, options_considered,
//                                   context, implementation, implications
//
// Rather than gate-keep a single shape, the reader is permissive:
// required fields are the bare minimum to render a card (id, topic);
// everything else is optional with sensible defaults. The transform
// normalizes to spec names for the rest of the app.
const rawTraceSchema = z.object({
  id: z.string(),
  topic: z.string(),
  // Accept either field name for status
  status: traceStatusSchema.optional(),
  thread_status: traceStatusSchema.optional(),
  // Accept either field name for category
  category: z.string().optional(),
  decision_category: z.string().optional(),
  project: z.string().optional().default(''),
  // session_id / opened_at / nodes are engine-spec requirements; human-
  // written document-style traces omit them. Default to empty so the
  // trace still imports and renders with available metadata.
  session_id: z.string().optional().default(''),
  skill: z.string().optional(),
  company_id: z.unknown().optional(),
  cycle_id: z.unknown().optional(),
  spine_priority_id: z.unknown().optional(),
  opened_at: z.string().optional(),
  resolved_at: z.string().nullable().default(null),
  resolution_summary: z.string().nullable().default(null),
  revisit_trigger: z.string().nullable().default(null),
  outcome: z.string().nullable().default(null),
  outcome_assessed_at: z.string().nullable().default(null),
  captured_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Document-style trace may carry a 'date' field as the single timestamp.
  date: z.string().optional(),
  nodes: z.array(traceNodeSchema).optional().default([]),
  edges: z.array(traceEdgeSchema).optional()
}).passthrough()

export const decisionTraceSchema = rawTraceSchema.transform((data) => ({
  ...data,
  status: data.status ?? data.thread_status ?? 'open' as const,
  category: data.category ?? data.decision_category ?? '',
  // captured_at falls back through every plausible timestamp field so
  // every valid trace always has one. Document-style traces use `date`.
  captured_at:
    data.captured_at ??
    data.created_at ??
    data.opened_at ??
    data.date ??
    new Date().toISOString(),
  opened_at: data.opened_at ?? data.date ?? data.created_at ?? data.captured_at ?? new Date().toISOString(),
}))

export type DecisionTraceSchema = z.output<typeof decisionTraceSchema>

// Request body schemas for API endpoints
export const loginBodySchema = z.object({ passcode: z.string().min(1) })
export const setupBodySchema = z.object({ passcode: z.string().min(6) })
export const projectBodySchema = z.object({ path: z.string().min(1) })
