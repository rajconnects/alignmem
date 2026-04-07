import { z } from 'zod'

// Zod schema for the canonical DecisionTrace JSON files.
// Validation happens at the filesystem boundary: any .json file in
// <project>/alignmink-traces/threads/ that fails this schema is
// reported to stderr and excluded from the indexer without crashing.

export const traceStatusSchema = z.enum(['open', 'resolved', 'contested', 'archived', 'deferred', 'stale'])

export const nodeTypeSchema = z.enum([
  'intent',
  'response',
  'question',
  'resolution',
  'dissent'
])

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
    related_topics: z.array(z.string()).default([])
  }).default({ source: '', session: '', related_topics: [] }),
  sequence_order: z.number(),
  created_at: z.string(),
  entities: traceNodeEntitiesSchema.optional()
}).passthrough()

export const traceEdgeSchema = z.object({
  id: z.string(),
  source_thread_id: z.string(),
  target_thread_id: z.string(),
  edge_type: z.string(),
  rationale: z.string().optional()
})

export const decisionTraceSchema = z.object({
  id: z.string(),
  topic: z.string(),
  status: traceStatusSchema,
  category: z.string(),
  project: z.string(),
  session_id: z.string(),
  skill: z.string().optional(),
  opened_at: z.string(),
  resolved_at: z.string().nullable().default(null),
  resolution_summary: z.string().nullable().default(null),
  revisit_trigger: z.string().nullable().default(null),
  outcome: z.string().nullable().default(null),
  outcome_assessed_at: z.string().nullable().default(null),
  captured_at: z.string(),
  nodes: z.array(traceNodeSchema),
  edges: z.array(traceEdgeSchema).optional()
}).passthrough()

export type DecisionTraceSchema = z.infer<typeof decisionTraceSchema>

// Request body schemas for API endpoints
export const loginBodySchema = z.object({ passcode: z.string().min(1) })
export const setupBodySchema = z.object({ passcode: z.string().min(6) })
export const projectBodySchema = z.object({ path: z.string().min(1) })
