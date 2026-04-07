# Architecture — Alignmem Decision Engine

## Overview

The Decision Engine is a modular skill system where specialized strategy skills (War Cabinet, future tools) share a common Decision Trace Protocol. The protocol ensures every decision is captured as a structured, graph-ready trace.

```
┌─────────────────────────────────────────────────┐
│                   SKILL.md                       │
│              (Router + Enforcer)                  │
│                                                   │
│  Detects intent → Routes to skill → Enforces     │
│  trace protocol on output                         │
└────────────┬──────────────┬───────────────────────┘
             │              │
    ┌────────▼────┐  ┌──────▼──────┐  ┌─────────────┐
    │ War Cabinet │  │ [Future     │  │ Freeform     │
    │ skill       │  │  Skill]     │  │ Conversation │
    │             │  │             │  │ (Mode A)     │
    └────────┬────┘  └──────┬──────┘  └──────┬───────┘
             │              │                 │
             ▼              ▼                 ▼
    ┌─────────────────────────────────────────────┐
    │         Decision Trace Protocol              │
    │         (core/decision-trace.md)             │
    │                                               │
    │  Detect → Confirm → Capture → Edge-check →   │
    │  Extract entities → Write → Index             │
    └────────────────────┬────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────┐
    │         Local File Storage                    │
    │         alignmink-traces/                     │
    │                                               │
    │  threads/{date}-{slug}.json                   │
    │  sessions/{date}-{slug}.json                  │
    │  DECISIONS.md                                 │
    └────────────────────┬────────────────────────┘
                         │
                         ▼ (optional: database sync)
    ┌─────────────────────────────────────────────┐
    │         Database (Optional)                   │
    │                                               │
    │  Compatible with decision_threads,            │
    │  decision_nodes, and decision_thread_edges    │
    │  table schemas                                │
    └─────────────────────────────────────────────┘
```

---

## Storage Model

The Decision Engine captures decisions in a simple, portable format:

| Component | What | Engine's Role |
|---|---|---|
| **Threads** | Decision records with full context | **Primary output.** Every skill writes here. |
| **Nodes** | Individual statements within a decision | Support detailed reasoning chains. |
| **Edges** | Relationships between decisions | Enable querying connected decisions. |
| **Sessions** | Records of skill invocations | Track when and how decisions were made. |

---

## How Skills Compose

### The Decision Contract

Any skill that participates in the engine must:

1. **Define its triggers** — phrases that activate the skill
2. **Define its architectural trigger** — the specific point where a decision is produced
3. **Emit a decision object** — conforming to `core/decision-schema.md`
4. **Not bypass confirmation** — always surface the decision for user confirmation
5. **Populate the `skill` field** — for attribution

### Adding a New Skill

1. Create `skills/{skill-name}.md` with the skill's protocol
2. Include trigger phrases, workflow, and the handoff section
3. In the handoff section, specify which node types the skill produces and how they map to `author_role`
4. The main SKILL.md router will detect the new file and route to it

No changes to core protocol or SKILL.md are needed. Drop the file and go.

### Example: Pre-Mortem Skill (hypothetical)

```markdown
# skills/pre-mortem.md

## Triggers
- "Run a pre-mortem on..."
- "What could go wrong with..."

## Workflow
1. User states the plan/decision
2. Generate 5 failure scenarios (ranked by likelihood × impact)
3. For each: cause, early warning signal, mitigation
4. User selects which risks to accept vs. mitigate

## Architectural Trigger
Step 4 — when the user accepts/mitigates risks, that's the decision.

## Handoff
- topic: "Pre-mortem: {plan}"
- thread_status: resolved
- skill: pre-mortem
- Nodes: intent (user's plan), responses (each failure scenario), resolution (accepted risks + mitigations)
```

---

## Graph Model

### Nodes (what's in the graph)

```
Decision Thread ──────── has ──────── Decision Nodes
     │                                     │
     ├── topic                             ├── content
     ├── thread_status                     ├── node_type
     ├── decision_category                 ├── author_role
     ├── resolution_summary                ├── entities (people, metrics, projects, timeframes)
     ├── revisit_trigger                   └── embedding (vector, for semantic search)
     └── skill
```

### Edges (how decisions connect)

```
Thread A ──depends_on──► Thread B
Thread C ──supersedes──► Thread D
Thread E ──contradicts─► Thread F
Thread G ──enables─────► Thread H
Thread I ──revisits────► Thread J
```

Edges are stored locally inside each source thread's `edges[]` array, pointing to `target_thread_id` values.

### Entity Index (what decisions are about)

Entities extracted from node content enable cross-cutting queries:

```
"ARR" ← mentioned in → Thread A (node 3), Thread D (node 1), Thread G (node 5)
"VP Eng" ← mentioned in → Thread B (node 2), Thread E (node 4)
"PLG motion" ← mentioned in → Thread A (node 1), Thread C (node 1)
```

Locally, entities are embedded in each node's `entities` JSONB. In Supabase, the GIN index on `decision_nodes.entities` enables fast containment queries.

### Traversal Queries

| Query | Implementation |
|---|---|
| "What led to this decision?" | Follow `depends_on` and `enables` edges backward from target thread |
| "What did this decision affect?" | Follow all edges forward from source thread |
| "Are there contradictions?" | Find `contradicts` edges, or compare resolution summaries |
| "What's been superseded?" | Find threads that are targets of `supersedes` edges |
| "Show the decision chain for {topic}" | BFS/DFS from the target thread, following all edge types |

---

## Schema Design (Database-Ready)

The local JSON schema is pre-aligned with common database patterns so you can optionally sync traces to a database later:

| Local JSON | Suggested DB Table | Notes |
|---|---|---|
| `threads/{date}-{slug}.json` | `decision_threads` | 1:1 mapping. Local `id` → UUID on sync. |
| `thread.nodes[]` | `decision_nodes` | Denormalized locally, normalized in DB. |
| `thread.edges[]` | `decision_thread_edges` | Relationship tracking. |
| `sessions/{date}-{slug}.json` | `decision_sessions` | Optional. Local-only by default. |
| `DECISIONS.md` | — | Human-readable index. Generated from thread files. |

**Appendix: Optional Database Integration**

When you're ready to sync to a database, the schema includes fields designed for database storage:
- `id` → UUID mapping
- `entities` JSONB for entity extraction
- `embedding` vector field for semantic search
- `spine_priority_id` for linking to strategic priorities (if using a strategy framework)

---

## File Structure

```
alignmem-decision-engine/
├── SKILL.md                    # Entry point: router + protocol enforcer
├── ARCHITECTURE.md             # This file
├── README.md                   # Install and quick-start guide
├── core/
│   ├── decision-trace.md       # Shared detection + capture + storage protocol
│   └── decision-schema.md      # JSON schema for local storage
├── skills/
│   ├── war-cabinet.md          # War Cabinet deliberation protocol
│   └── [future-skill].md      # Drop new skills here
├── scripts/
│   └── init.sh                 # Directory bootstrapping
└── references/
    └── EXAMPLES.md             # Worked examples (TODO)
```

---

## Design Principles

1. **Skills are prompt architecture, not code.** Each skill is a `.md` file with instructions. No runtime, no dependencies, no build step.
2. **The protocol is the product.** The Decision Trace Protocol is the shared contract. Skills are interchangeable; the protocol is permanent.
3. **Local-first, sync-ready.** All state lives as JSON files on the user's machine. The schema is pre-aligned to Supabase so sync is a data pipeline, not a migration.
4. **Graph-ready from day one.** Edges, entities, and traversal are built into the schema even if sparsely populated initially. Retrofitting relationships is expensive; carrying empty arrays is free.
5. **Confirmation over automation.** Every decision capture requires user confirmation. The engine detects and suggests; the user decides what gets recorded.
