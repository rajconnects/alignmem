// Domain types matching the DecisionTrace JSON schema in
// Product-Documentation/Specs/alignmem-trace-reader-v1-dashboard-spec.md §4.
// The reader is read-only — these types are the contract with the filesystem.

export type TraceStatus = 'open' | 'resolved' | 'contested' | 'archived'

export type NodeType = 'intent' | 'response' | 'question' | 'resolution' | 'dissent'

export type AuthorRole = 'founder' | 'advisor' | 'board' | 'cofounder' | 'other'

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

export interface DecisionTrace {
  id: string
  topic: string
  status: TraceStatus
  category: string
  project: string
  session_id: string
  opened_at: string
  resolved_at: string | null
  resolution_summary: string | null
  revisit_trigger: string | null
  outcome: string | null
  outcome_assessed_at: string | null
  captured_at: string
  nodes: TraceNode[]
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
