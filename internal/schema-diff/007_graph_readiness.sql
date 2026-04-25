-- Migration 007: Graph Readiness
-- Adds three structural capabilities to the Episodic Memory layer:
--   1. decision_thread_edges — first-class typed edges between decision threads
--   2. revisit_trigger on decision_threads — temporal edge for reopening decisions
--   3. entities JSONB on decision_nodes — extracted people, metrics, projects, timeframes
--
-- Follows migrations 001-006 (extensions through cross_company_memory)
-- Project: acshktcuxeagfnxpdsiu (Alignmink-V1)

-- ============================================================
-- GAP 1: Thread-to-Thread Edges
-- ============================================================
-- Transforms episodic memory from a flat decision log into a
-- traversable context graph. Enables queries like:
--   "Show me the chain of decisions that led to this pivot"
--   "What decisions depend on this one?"
--   "Has this decision been superseded?"

CREATE TABLE IF NOT EXISTS public.decision_thread_edges (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    company_id      UUID        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source_thread_id UUID       NOT NULL REFERENCES public.decision_threads(id) ON DELETE CASCADE,
    target_thread_id UUID       NOT NULL REFERENCES public.decision_threads(id) ON DELETE CASCADE,
    edge_type       TEXT        NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id),

    -- Prevent duplicate edges of the same type between the same threads
    CONSTRAINT uq_thread_edge UNIQUE (source_thread_id, target_thread_id, edge_type),

    -- Prevent self-referencing edges
    CONSTRAINT chk_no_self_edge CHECK (source_thread_id != target_thread_id),

    -- Valid edge types
    CONSTRAINT chk_edge_type CHECK (
        edge_type IN ('depends_on', 'supersedes', 'contradicts', 'enables', 'revisits')
    )
);

-- Index for traversal: "what decisions does this thread connect to?"
CREATE INDEX idx_thread_edges_source ON public.decision_thread_edges(source_thread_id);
CREATE INDEX idx_thread_edges_target ON public.decision_thread_edges(target_thread_id);

-- Index for company-scoped graph queries
CREATE INDEX idx_thread_edges_company ON public.decision_thread_edges(company_id);

-- Index for edge-type filtering: "show me all contradictions"
CREATE INDEX idx_thread_edges_type ON public.decision_thread_edges(edge_type);

-- RLS: same pattern as decision_threads
ALTER TABLE public.decision_thread_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see edges for their companies"
    ON public.decision_thread_edges FOR SELECT
    USING (company_id IN (SELECT public.get_user_company_ids()));

CREATE POLICY "Strategists and admins manage edges"
    ON public.decision_thread_edges FOR ALL
    USING (public.user_has_role(company_id, ARRAY['strategist', 'admin']));


-- ============================================================
-- GAP 2: Revisit Trigger on Decision Threads
-- ============================================================
-- The local JSON schema has this field but the DB doesn't.
-- This is the temporal edge — the condition under which a
-- resolved or deferred decision should be reopened.
-- Examples: "if Q3 revenue misses by >20%", "when we hire a VP Sales"

ALTER TABLE public.decision_threads
    ADD COLUMN IF NOT EXISTS revisit_trigger TEXT;

COMMENT ON COLUMN public.decision_threads.revisit_trigger IS
    'Condition that should trigger reopening this decision. '
    'Set at resolution or deferral time. '
    'Examples: "if Q3 revenue misses by >20%", "when we hire a VP Sales"';


-- ============================================================
-- GAP 3: Entity Extraction on Decision Nodes
-- ============================================================
-- Enables graph queries like:
--   "Show me every decision that touches ARR"
--   "Every decision involving VP Eng"
--   "Decisions about the PLG motion"
-- Without requiring full-text scanning of content.
--
-- Schema:
-- {
--   "people": ["Arun", "VP Eng"],
--   "metrics": ["ARR", "$2M target", "30% conversion"],
--   "projects": ["PLG motion", "Enterprise tier"],
--   "timeframes": ["Q3 2026", "end of March"]
-- }

ALTER TABLE public.decision_nodes
    ADD COLUMN IF NOT EXISTS entities JSONB;

COMMENT ON COLUMN public.decision_nodes.entities IS
    'Extracted entities from node content. '
    'Schema: {people: string[], metrics: string[], projects: string[], timeframes: string[]}. '
    'Populated by the Decision Engine skill on capture, or backfilled by batch processing.';

-- GIN index for fast JSONB containment queries
-- e.g., WHERE entities @> '{"metrics": ["ARR"]}'
CREATE INDEX IF NOT EXISTS idx_nodes_entities
    ON public.decision_nodes USING GIN (entities jsonb_path_ops);


-- ============================================================
-- BONUS: Skill Attribution on Decision Threads
-- ============================================================
-- Tracks which skill produced the decision (war-cabinet, etc.)
-- Useful for analytics and filtering.

ALTER TABLE public.decision_threads
    ADD COLUMN IF NOT EXISTS skill TEXT;

COMMENT ON COLUMN public.decision_threads.skill IS
    'Which Decision Engine skill produced this thread. '
    'Examples: "war-cabinet", "decision-trace", "pre-mortem"';

CREATE INDEX IF NOT EXISTS idx_threads_skill
    ON public.decision_threads(skill)
    WHERE skill IS NOT NULL;


-- ============================================================
-- FIX: Expand author_role CHECK constraint on decision_nodes
-- ============================================================
-- The original schema only allows 4 roles ('ceo', 'vp_eng',
-- 'vp_product', 'strategist'). The Decision Engine needs
-- additional roles for founders, advisors, and War Cabinet
-- advisor personas.

-- Drop the existing CHECK constraint if it exists
-- (constraint name may vary — use DO block for safety)
DO $$
BEGIN
    -- Attempt to drop the existing author_role check constraint
    -- The constraint name depends on how it was originally created
    EXECUTE (
        SELECT 'ALTER TABLE public.decision_nodes DROP CONSTRAINT ' || conname
        FROM pg_constraint
        WHERE conrelid = 'public.decision_nodes'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%author_role%'
        LIMIT 1
    );
EXCEPTION
    WHEN OTHERS THEN NULL; -- No constraint found, continue
END $$;

-- Add the expanded CHECK constraint
ALTER TABLE public.decision_nodes
    ADD CONSTRAINT chk_author_role CHECK (
        author_role IN (
            'ceo', 'founder', 'vp_eng', 'vp_product', 'vp_sales',
            'cfo', 'strategist', 'advisor', 'team_member',
            'war_cabinet_priya', 'war_cabinet_marcus',
            'war_cabinet_maya', 'war_cabinet_ravi', 'war_cabinet_nadia'
        )
    );
