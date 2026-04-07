# Decision Schema Reference

> **Purpose:** Canonical JSON schema for decision threads, nodes, sessions, and edges. Designed for local file storage and compatible with database sync patterns when needed.

---

## 1. Decision Thread

**File:** `alignmink-traces/threads/{YYYY-MM-DD}-{topic-slug}.json`

**Naming:** Date is when the decision was **made** (not when the trace was captured). Slug is a lowercase, hyphenated summary of the topic (max 50 chars).

```json
{
  "id": "dt-{YYYY-MM-DD}-{4-char-hex}",
  "company_id": null,
  "cycle_id": null,
  "topic": "Short label (e.g., 'PLG vs. sales-led pivot')",
  "thread_status": "open",
  "decision_category": null,
  "spine_priority_id": null,
  "skill": "war-cabinet",
  "session_id": "sess-{YYYY-MM-DD}-{slug}",

  "opened_at": "ISO-8601 (when decision was MADE)",
  "resolved_at": null,
  "resolution_summary": null,
  "revisit_trigger": null,
  "outcome": null,
  "outcome_assessed_at": null,

  "nodes": [ ],
  "edges": [ ],

  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### Field Reference

| Field | Type | Required | DB Column | Notes |
|---|---|---|---|---|
| `id` | string | YES | Optional: `id` (UUID in DB) | Local format: `dt-{date}-{hex}`. Maps to UUID on database sync. |
| `company_id` | string/null | NO | Optional: `company_id` | NULL for local traces. Set on database sync if needed. |
| `cycle_id` | string/null | NO | Optional: `cycle_id` | Links to a weekly cycle if applicable. |
| `topic` | string | YES | `topic` | Short label. Max 120 chars. |
| `thread_status` | enum | YES | `thread_status` | `open`, `acknowledged`, `contested`, `resolved`, `deferred`, `stale` |
| `decision_category` | enum/null | NO | Optional: `decision_category` | `resource_allocation`, `product_scope`, `hiring`, `market_strategy`, `compliance`, `operations`, `partnerships` |
| `spine_priority_id` | string/null | NO | Optional: `spine_priority_id` | Links to strategic priority if using a strategy framework. NULL for independent traces. |
| `skill` | string | YES | `skill` | Which skill produced this trace. |
| `session_id` | string | YES | Optional: `session_id` | Links to session file. |
| `opened_at` | ISO-8601 | YES | `opened_at` | When the decision was MADE, not captured. |
| `resolved_at` | ISO-8601/null | NO | Optional: `resolved_at` | When resolution was reached. |
| `resolution_summary` | string/null | NO | Optional: `resolution_summary` | One-line summary of the resolution. |
| `revisit_trigger` | string/null | NO | Optional: `revisit_trigger` | Condition to reopen the decision. |
| `outcome` | string/null | NO | Optional: `outcome` | What actually happened after. Filled later. |
| `outcome_assessed_at` | ISO-8601/null | NO | Optional: `outcome_assessed_at` | When outcome was recorded. |
| `nodes` | array | YES | Optional: Separate table | Inline in JSON. Can be normalized in database. |
| `edges` | array | YES | Optional: Separate table | Inline in JSON. Can be normalized in database. |

---

## 2. Decision Node

Nodes live inside the `nodes` array of a thread. In Supabase, they're rows in `decision_nodes`.

```json
{
  "id": "dn-{sequence}",
  "node_type": "intent",
  "author_role": "founder",
  "author_name": "Arun",
  "content": "Verbatim or close paraphrase of what was said",
  "context": {
    "source": "war_cabinet",
    "session": "Topic label",
    "pulse_week": null,
    "related_docs": [],
    "trigger": null
  },
  "entities": {
    "people": ["Arun", "VP Eng"],
    "metrics": ["ARR", "$2M target"],
    "projects": ["PLG motion"],
    "timeframes": ["Q3 2026"]
  },
  "embedding": null,
  "sequence_order": 1,
  "created_at": "ISO-8601"
}
```

### Field Reference

| Field | Type | Required | DB Column | Notes |
|---|---|---|---|---|
| `id` | string | YES | Optional: `id` (UUID in DB) | Local: `dn-{seq}`. Maps to UUID on database sync. |
| `node_type` | enum | YES | `node_type` | `intent`, `response`, `resolution` |
| `author_role` | string | YES | `author_role` | `ceo`, `founder`, `vp_eng`, `vp_product`, `vp_sales`, `cfo`, `strategist`, `advisor`, `team_member`, `war_cabinet_priya`, `war_cabinet_marcus`, `war_cabinet_maya`, `war_cabinet_ravi`, `war_cabinet_nadia` |
| `author_name` | string | NO | Optional: `author_name` | Human-readable name. For War Cabinet advisors, use their persona name. |
| `content` | string | YES | `content` | Full verbatim content. |
| `context` | object | NO | Optional: `context` (JSONB) | Source metadata. |
| `entities` | object | NO | Optional: `entities` (JSONB) | Extracted entities for graph traversal (people, metrics, projects, timeframes). |
| `embedding` | array/null | NO | Optional: `embedding` (vector) | Semantic vector. NULL locally, computed on database sync if needed. |
| `sequence_order` | integer | YES | `sequence_order` | Position within thread. 1-indexed. |
| `created_at` | ISO-8601 | YES | `created_at` | — |

### Node Types

| Type | When Used | Example |
|---|---|---|
| `intent` | Initial direction stated by someone | CEO: "I think we should go PLG" |
| `response` | Reaction, pushback, analysis, or advisor position | War Cabinet Maya: "The strongest case against PLG is..." |
| `resolution` | Final decision / alignment reached | "Decision: We're going sales-led for enterprise, PLG for SMB" |

### Author Roles for War Cabinet

When the War Cabinet skill produces nodes, use these author_role values:
- `war_cabinet_priya` — The Operator
- `war_cabinet_marcus` — The Capital Allocator
- `war_cabinet_maya` — The Contrarian
- `war_cabinet_ravi` — The Domain Expert
- `war_cabinet_nadia` — The Customer Proxy

This preserves the advisor identity in the trace while keeping `advisor` available for Claude's own contributions.

---

## 3. Decision Thread Edge

Edges live inside the `edges` array of a thread. In Supabase, they're rows in `decision_thread_edges` (migration 007).

```json
{
  "id": "de-{source-thread-short}-{target-thread-short}",
  "target_thread_id": "dt-2026-03-15-prior-decision",
  "edge_type": "depends_on",
  "description": "Hiring decision depends on the go-to-market call",
  "created_at": "ISO-8601"
}
```

### Edge Types

| Type | Meaning | Direction |
|---|---|---|
| `depends_on` | This decision requires the target decision to hold | Source depends on Target |
| `supersedes` | This decision replaces/updates the target decision | Source replaces Target |
| `contradicts` | This decision conflicts with the target decision | Source contradicts Target |
| `enables` | This decision makes the target decision possible | Source enables Target |
| `revisits` | This decision reopens the target decision | Source revisits Target |

### Edge Detection Heuristics

When to suggest edges:
- **Same `decision_category`** + overlapping keywords in `topic` → likely `depends_on` or `supersedes`
- **Same `spine_priority_id`** → likely `depends_on` or `enables`
- **Opposing `resolution_summary`** content → likely `contradicts`
- **Deferred decision reopened** → `revisits`
- **War Cabinet session referencing a prior decision** → `revisits` or `supersedes`

Always confirm edge creation with the user. Never create edges silently.

---

## 4. Session File

**File:** `alignmink-traces/sessions/{YYYY-MM-DD}-{context-slug}.json`

```json
{
  "id": "sess-{YYYY-MM-DD}-{slug}",
  "context": "Brief description of what was being worked through",
  "date": "YYYY-MM-DD",
  "mode": "war_cabinet",
  "skill": "war-cabinet",
  "participants": [
    { "name": "Arun", "role": "founder" },
    { "name": "Claude", "role": "advisor" }
  ],
  "thread_ids": ["dt-2026-03-30-a1b2"],
  "summary": "Brief summary of session and key decisions made",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

---

## 5. Appendix: Optional Database Integration

When you're ready to sync local JSON files to a database:

1. **ID mapping:** Local `dt-{date}-{hex}` IDs should be mapped to UUIDs. Maintain a mapping file or generate deterministic UUIDs from the local ID.
2. **Normalization:** Local files embed `nodes` and `edges` inside the thread JSON. In a database, these should become separate rows in `decision_nodes` and `decision_thread_edges` tables.
3. **Embeddings:** `embedding` fields are NULL locally. On database sync, compute embeddings via an API and populate in the database.
4. **company_id:** NULL locally. Set to your organization's UUID on database sync if needed.
5. **Schema migration:** If using a SQL database, ensure tables are created with columns matching the optional fields noted above.
