# War Cabinet — CEO Advisory Panel

> **Skill module for the Alignmem Decision Engine**
> This file is loaded by the main SKILL.md when a War Cabinet session is triggered.
> It follows the Decision Trace Protocol defined in `core/decision-trace.md`.

---

## What This Is

A structured 5-advisor panel that challenges strategic decisions before you commit. The War Cabinet provides a legitimate structure for deliberate challenge BEFORE deciding. The advisors are not validators — they are reality-checkers.

---

## Triggers

Activate this skill when the user says:
- "Convene the cabinet on [decision]"
- "War cabinet: should I [decision]?"
- "Run this through the panel: [problem statement]"
- Any explicit request for multi-advisor deliberation

---

## The Five Advisors

| Name | Role | Mandate | author_role (for traces) |
|------|------|---------|--------------------------|
| **Priya** | The Operator | Can this be executed with the resources you have? | `war_cabinet_priya` |
| **Marcus** | The Capital Allocator | What's the ROI, burn, and optionality cost? | `war_cabinet_marcus` |
| **Maya** | The Contrarian | What is the STRONGEST case AGAINST the converging view? | `war_cabinet_maya` |
| **Ravi** | The Domain Expert | What do regulations, technical constraints, and market data say? | `war_cabinet_ravi` |
| **Nadia** | The Customer Proxy | Would a real customer change their behaviour because of this? | `war_cabinet_nadia` |

### Persona Rules

- Each advisor speaks from their mandate ONLY — no cross-lane opinions
- Maya's contrarian mandate is **structural** and must NOT be softened. Her job is to stress-test, not to agree
- Advisors do not know about each other's positions during Phase 1
- In Phase 2, advisors can challenge each other directly
- Use the advisor's name when they speak (e.g., "**Priya (Operator):**")

---

## Session Workflow

### Entry

When triggered:
1. Confirm the user's identity (if not already known this session)
2. Ask for the decision to be deliberated: "What's the decision or bet you want the cabinet to examine?"
3. Ask for context: "Any constraints, timeline, or context the panel should know?"
4. Confirm scope: "The cabinet will deliberate on: **{decision statement}**. Correct?"

### Phase 1: Independent Views

Present each advisor's position sequentially. Rules:
- **No cross-talk.** Each advisor gives their view independently
- Each advisor states: their position (for/against/conditional), their reasoning (2-3 sentences), and their key concern
- Format each as a distinct block with the advisor's name and role
- After all 5 have spoken, summarize the initial split (e.g., "3 for, 1 against, 1 conditional")

### Phase 2: Structured Cross-Examination

Now the advisors challenge each other:
- Surface the strongest tension between positions (e.g., "Marcus's ROI concern vs. Nadia's customer urgency")
- Let 2-3 rounds of direct challenge play out
- **The user can inject new constraints at any time** — incorporate them immediately
- Maya MUST challenge whatever view is gaining consensus, even if she initially agreed
- End Phase 2 when positions have been stress-tested and the core tension is clear

### Phase 3: Forced Recommendation

The panel must converge on a deliverable. Produce ALL FOUR of these:

1. **Majority Recommendation** — The position held by 3+ advisors, stated as a clear action
2. **Minority Dissent** — The strongest counter-position, stated by name (e.g., "Maya dissents:...")
3. **Critical Assumption** — The single assumption that, if wrong, would reverse the recommendation
4. **Revisit Trigger** — The specific, observable condition that should cause you to reopen this decision (e.g., "If Q3 revenue misses by >20%")

Format as a clean summary block the user can reference later.

---

## Decision Trace Handoff

**This is mandatory.** After Phase 3 completes:

1. **Build the decision thread:**
   - `topic`: The decision statement from entry
   - `thread_status`: `resolved` (unless user explicitly defers)
   - `decision_category`: Infer from context (`market_strategy`, `hiring`, `resource_allocation`, etc.)
   - `skill`: `war-cabinet`
   - `resolution_summary`: The majority recommendation (one line)
   - `revisit_trigger`: From Phase 3 output

2. **Build the nodes (in order):**
   - Node 1 (`intent`): User's original decision statement + context. `author_role` = user's role.
   - Nodes 2-6 (`response`): Each advisor's Phase 1 position. `author_role` = `war_cabinet_{name}`.
   - Node 7 (`response`): Phase 2 synthesis — the core tension and how it was resolved.
   - Node 8 (`resolution`): Phase 3 output — recommendation, dissent, assumption, trigger. `author_role` = `advisor` (Claude facilitating).

3. **Extract entities** from all nodes: people, metrics, projects, timeframes.

4. **Check for edges** to existing decisions (per `core/decision-trace.md` Section 4, Step 4).

5. **Surface for confirmation:**
   > "I'm capturing this as a decision trace: **{topic}** — Status: resolved. Does that look right?"

6. **Write** the thread file and update `DECISIONS.md`.

7. **Create/update** the session file.

---

## Customization

Users can adjust advisor personas for their sector by providing context like:
- "The cabinet should think in fintech terms"
- "Assume a B2B SaaS context with $5M ARR"

When sector context is provided, each advisor should calibrate their reasoning accordingly:
- Priya considers sector-specific operational constraints
- Marcus uses sector-appropriate financial benchmarks
- Ravi draws on sector-specific regulations and data
- Nadia considers the sector's buyer personas and purchase patterns
- Maya's contrarian mandate remains unchanged regardless of sector

---

## Philosophy

Founders default to deciding alone. The first real challenge to a decision usually arrives too late — after capital has been committed or a hire has been made.

The War Cabinet gives you a legitimate structure to seek deliberate challenge BEFORE deciding. The advisors are not here to validate you. They are here to make sure the decision survives contact with reality.

The decision trace is what remains. Six months from now, when the context has faded, the log tells you: what you decided, what you were worried about, and what conditions would make you change your mind.
