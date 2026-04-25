// Domain types matching server/schema.ts.
// The reader is read-only — these types are the contract with the filesystem.

export type TraceStatus =
  | 'open'
  | 'resolved'
  | 'contested'
  | 'archived'
  | 'deferred'
  | 'stale'
  | 'superseded'

// node_type is open at the schema level; this alias documents the common
// values without restricting them.
export type NodeType = string

// Open string at the schema level; common values listed for reference.
export type AuthorRole = string

export interface TraceNodeContext {
  source: string
  session: string
  related_topics: string[]
}

export interface TraceNode {
  id: string
  node_type: NodeType
  author_role: AuthorRole
  author_name: string
  content: string
  context: TraceNodeContext
  sequence_order: number
  created_at: string
}

// ── DTP v0.1 sub-types ───────────────────────────────────

export interface TraceAuthor {
  name: string
  role: string
  id?: string
}

export interface DecisionAlternative {
  option: string
  rejected_because: string
}

export interface Decision {
  statement: string
  reasoning: string
  alternatives: DecisionAlternative[]
}

export type AttachmentKind = 'url' | 'file_path' | 'inline_text'

export interface Attachment {
  kind: AttachmentKind
  value: string
  description?: string
}

export type Impact = 'low' | 'medium' | 'high' | 'critical'

export interface Outcome {
  observed_at?: string | null
  observation?: string | null
  success?: boolean | null
}

export interface TraceEdge {
  type?: string
  edge_type?: string
  target_trace_id?: string
  target_thread_id?: string
  note?: string
  rationale?: string
  description?: string
}

// ── Top-level trace ──────────────────────────────────────

export interface DecisionTrace {
  // Identity (engine + DTP)
  id: string
  trace_id: string
  topic: string
  title: string

  // Lifecycle
  status: TraceStatus
  category: string
  project: string

  // Timestamps
  captured_at: string
  opened_at: string
  resolved_at: string | null

  // Engine fields (legacy)
  session_id: string
  resolution_summary: string | null
  revisit_trigger: string | null
  outcome: string | Outcome | null
  outcome_assessed_at: string | null
  nodes: TraceNode[]
  edges?: TraceEdge[]

  // DTP v0.1 fields
  schema_version?: string
  author?: TraceAuthor
  decision?: Decision
  themes?: string[]
  revisit_triggers?: string[]
  confidence?: number
  impact?: Impact
  attachments?: Attachment[]
  content_hash?: string
  thread_id?: string
  captured_via?: string
  extensions?: Record<string, unknown>
}

export type AgeBucket = '7d' | '14d' | '30d' | 'older'

// Derived fields computed by the indexer on load.
export interface TraceDerived {
  participants: string[]
  turn_count: number
  duration_days: number | null
  age_bucket: AgeBucket
  topic_tags: string[]
  file_name: string
}

export type IndexedTrace = DecisionTrace & TraceDerived

export interface ProjectEntry {
  name: string
  path: string
  last_seen: string
  trace_count?: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export type LensKind = 'topic' | 'collaborator' | 'time'

export interface LensSelection {
  kind: LensKind
  value: string // e.g. 'product_scope', 'Arun', '7d'
}

export type StatusFilter = 'all' | TraceStatus
