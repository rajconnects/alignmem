# Decision Trace Protocol — Core Module

> **Role:** This is the shared protocol that ALL skills in the Alignmem Decision Engine MUST follow after producing a decision. It is loaded by the main SKILL.md and injected into every skill's execution context.

---

## 1. Purpose

The Decision Trace Protocol captures structured decision traces from any skill session — War Cabinet, future strategy skills, or freeform advisory conversations. It ensures every decision is persisted as a traversable record in your personal decision journal, not just a log entry.

Every trace written by this protocol is stored as JSON files that form the source of truth for your decisions. This format is design-compatible with database storage, should you choose to sync traces to a database in the future.

---

## 2. When This Protocol Fires

This protocol is **mandatory** and **automatic**. It fires when ANY of the following occur during a skill session:

### Decision Signals (detect these in conversation)

**Explicit commitments:**
- "Let's go with…", "I've decided…", "We're committing to…"
- "The recommendation is…", "The cabinet recommends…"

**Trade-off resolutions:**
- Choosing between competing options with stated justification
- "We're doing X instead of Y because…"

**Contested points resolved:**
- Pushback surfaced, debated, then agreement reached

**Deferrals (these ARE decisions):**
- "Let's revisit this when…", "I need more data before deciding"
- "Park this until…"

**Scope decisions:**
- "That's out of scope for now"
- "We're explicitly NOT doing…"

### Architectural Triggers (from structured skills)

- **War Cabinet:** Phase 3 completion (forced recommendation) — ALWAYS fires
- **Future skills:** Any skill that reaches a resolution point defined in its own SKILL.md

### What is NOT a Decision

- Status updates or information sharing without a choice point
- Questions without resolution
- Casual conversation or context-setting

---

## 3. Detection and Confirmation Flow

### Step 1: Detect

When a decision signal is detected (linguistic or architectural), surface it to the user immediately:

> "I'm capturing a decision: **{topic}**. Does that look right?"

### Step 2: Confirm

Wait for user confirmation. The user may:
- Confirm as-is → proceed to capture
- Refine the framing → adapt topic/summary and proceed
- Reject → do not capture, continue conversation

**Never write a trace without confirmation.** The confirmation step is what ensures accuracy.

### Step 3: Capture

Build the decision thread object (see schema in `core/decision-schema.md`) and write it immediately. Do not batch decisions — persist each one as soon as confirmed.

### Step 4: Edge Detection

After capturing, check for relationships to existing decisions:
- Scan existing threads in `alignmink-traces/threads/` for topic overlap
- If a relationship is found, ask the user:
  > "This seems related to your earlier decision on **{prior topic}**. Is this a dependency, a revision, or a contradiction?"
- If confirmed, write an edge entry to the thread's `edges` array

### Step 5: Entity Extraction

Extract and attach entities from the decision content:
- **People:** Names and roles mentioned (e.g., "VP Eng", "Priya")
- **Metrics:** Quantitative references (e.g., "ARR", "$2M target", "30% conversion")
- **Projects/Products:** Named initiatives, features, or bets
- **Timeframes:** Dates, quarters, deadlines mentioned

Store these in the `entities` field of each decision node.

---

## 4. Storage Protocol

### Directory Structure

All traces are stored in the user's **workspace folder**, never in Claude's sandbox.

```
[workspace-folder]/
└── alignmink-traces/
    ├── DECISIONS.md              # Human-readable index (3 tables)
    ├── threads/
    │   └── {YYYY-MM-DD}-{slug}.json    # One file per decision thread
    └── sessions/
        └── {YYYY-MM-DD}-{slug}.json    # One file per skill session
```

### First-Run Bootstrap

On first invocation:
1. Check if `alignmink-traces/` exists in the workspace folder
2. If not, create it with `threads/` and `sessions/` subdirectories
3. Generate `DECISIONS.md` from the template (see Section 7)
4. Confirm path to user: "Decision traces will be stored at `[path]/alignmink-traces/`"

If no workspace folder is selected, ask the user to select one. **Never fall back to sandbox/temp locations.**

### Write Confirmation

After every file write, confirm:
> "Saved decision trace to `[full-path]/alignmink-traces/threads/2026-03-30-topic-slug.json`"

---

## 5. Status Lifecycle

```
open → acknowledged    (agreed, no tension)
open → contested       (someone pushes back)
contested → resolved   (agreement reached through deliberation)
open → deferred        (postponed with revisit trigger)
deferred → open        (revisited when trigger condition met)
any → stale            (no activity for 14+ days, flagged on queries)
```

### Status Rules

- **War Cabinet decisions** start as `resolved` (Phase 3 forces a recommendation) unless the user explicitly defers
- **Conversational decisions** start as `open` and progress through the lifecycle
- **Stale detection:** When querying traces, flag any `open` or `contested` thread not updated in 14+ days

---

## 6. Session Management

### Session File

Every skill invocation creates a session file:

```json
{
  "id": "sess-{YYYY-MM-DD}-{context-slug}",
  "context": "Brief description of what was being worked through",
  "date": "YYYY-MM-DD",
  "mode": "war_cabinet | thinking_with_claude | conversation_extraction | [skill_name]",
  "skill": "war-cabinet | decision-trace | [future-skill-name]",
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

### Session Close Protocol

When a skill session ends:
1. Summarize all decisions captured during the session
2. List any threads left `open` or `contested`
3. Update the session file with final `thread_ids` and summary
4. Update `DECISIONS.md` index
5. Offer: "Want me to flag any of these for follow-up next session?"

---

## 7. DECISIONS.md Index Template

```markdown
# Decision Traces
> Captured by Alignmem Decision Engine
> Every decision leaves a trace.

## Open Decisions
| Date | Decision | Category | Status | Skill | Participants |
|------|----------|----------|--------|-------|--------------|

## Resolved Decisions
| Date | Decision | Category | Resolution | Skill | Participants |
|------|----------|----------|------------|-------|--------------|

## Deferred Decisions
| Date | Decision | Category | Revisit Trigger | Skill | Participants |
|------|----------|----------|-----------------|-------|--------------|
```

Update this file every time a thread is created or its status changes. Add a `Skill` column to track which skill produced the decision.

---

## 8. Query Protocol

When the user asks about past decisions, execute these query patterns:

| User Query | Action |
|---|---|
| "What did I decide about X?" | Search thread topics and node content for keywords. Return full thread with all nodes. |
| "Show me open decisions" | Filter by `status: open`. Flag any not updated in 14+ days as stale. |
| "Show me decisions from [date/session]" | Filter by session or date range. |
| "Have I contradicted a previous decision?" | Compare current conversation against resolved threads. Surface conflicts with context. |
| "Show me decisions by category" | Group threads by `decision_category` field. |
| "What's deferred?" | Show deferred threads with revisit triggers. |
| "What decisions are connected to X?" | Traverse `edges` arrays to find related threads. |
| "Show me the chain that led to X" | Recursive edge traversal: follow `depends_on` and `enables` edges backward. |

### Query Implementation

1. Read all thread JSON files from `threads/` directory
2. Parse and filter based on query type
3. For graph traversal queries: follow `edges[].target_thread_id` references across files
4. Present results in scannable format with source links

---

## 9. Contradiction Detection

When a new decision is being captured:
1. Scan resolved thread topics and resolution summaries for keyword overlap
2. If a potential contradiction is found, surface it:
   > "This may contradict your earlier decision on **{topic}**: *{resolution_summary}*. Want to mark that decision as superseded?"
3. If confirmed, create a `contradicts` edge between the two threads and update the prior thread's status

---

## 10. Integration Contract for New Skills

Any skill that wants to participate in the Decision Engine must:

1. **Import this protocol** — reference `core/decision-trace.md` in its own SKILL.md
2. **Define its architectural trigger** — the point in its workflow where a decision is produced
3. **Emit a decision object** — conforming to the schema in `core/decision-schema.md`
4. **Not bypass confirmation** — even structured skills must surface the decision for user confirmation
5. **Populate the `skill` field** — so traces are attributed to the producing skill

That's it. Drop a `.md` file in `skills/`, follow these five rules, and the protocol handles storage, indexing, querying, and graph traversal.
