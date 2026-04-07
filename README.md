# Alignmem - Decision Memory Claude Skill

> Give Claude memory of the decisions you have made and 'Why'.

You make dozens of strategic decisions inside AI conversations. Pricing pivots, hiring calls, go-to-market bets. Then the conversation ends, and the reasoning disappears. Three months later, you remember _what_ you decided but not _why_ -- or what you were worried about when you made the call.

What you get: Once set up, Claude asks you when you make a big decision & captures and logs your decision with the reasoning. Sometimes you ask, and mostly Claude will suggest you do.

Alignmem captures those decisions as structured traces and provides a local dashboard for searching, filtering, and revisiting them. The decision engine runs inside Claude. The trace reader runs on your machine. Nothing leaves localhost.

&nbsp;

## Quick Start

Three commands. That's it.

```bash
git clone https://github.com/rajconnects/alignmem.git
cd alignmem
./start.sh
```

Open [http://localhost:3000](http://localhost:3000). Sample decisions are preloaded.

&nbsp;

## Quick Start with Docker

```bash
git clone https://github.com/rajconnects/alignmem.git
cd alignmem
docker compose up
```

Same result. Open [http://localhost:3000](http://localhost:3000).

&nbsp;

## How It Works

```
You + Claude                    Your Machine
─────────────                   ────────────

  Strategic conversation
  "Should we go PLG or
   sales-led for enterprise?"
         │
         ▼
  Decision Engine detects
  a decision point
         │
         ▼
  Captures reasoning as ──────► JSON trace file
  a structured trace            saved to disk
                                     │
                                     ▼
                            Trace Reader watches
                            the directory
                                     │
                                     ▼
                            Dashboard at localhost:3000
                            shows your decisions
```

1. You have a strategic conversation in Claude.
2. The decision engine detects decisions and captures them as JSON files.
3. The trace reader watches those files and renders them in a dashboard.
4. Everything stays on your machine. No cloud. No sync. No accounts.

&nbsp;

## Setting Up the Decision Engine

The engine is a set of Claude Code skills that detect and capture decisions during your conversations.

1. Copy the engine directory to your Claude skills folder:
   ```bash
   cp -r engine/ ~/.claude/skills/alignmem/
   ```

2. Start a conversation in Claude Code as you normally would.

3. The engine detects decisions automatically -- when you resolve a direction, make a call, or close a debate, it captures the trace.

4. Or invoke the War Cabinet directly:
   ```
   "Convene the cabinet on whether we should raise now or extend runway"
   ```

Traces are saved to `alignmink-traces/threads/` in your project directory.

&nbsp;

## War Cabinet

A structured 5-advisor panel that stress-tests your decisions before you commit.

| Advisor | Role | They Ask |
|---------|------|----------|
| **Priya** | The Operator | Can this be executed with the resources you have? |
| **Marcus** | The Capital Allocator | What's the ROI, burn, and optionality cost? |
| **Maya** | The Contrarian | What is the strongest case _against_ the converging view? |
| **Ravi** | The Domain Expert | What do regulations, constraints, and market data say? |
| **Nadia** | The Customer Proxy | Would a real customer change their behaviour because of this? |

**Three phases:**

1. **Independent views** -- each advisor gives their position without seeing the others.
2. **Cross-examination** -- advisors challenge each other directly. Maya is structurally required to oppose consensus.
3. **Forced recommendation** -- majority position, minority dissent, the critical assumption, and the specific trigger that should make you revisit.

The entire session is captured as a decision trace.

&nbsp;

## The Dashboard

The trace reader gives you a local interface to navigate your decision history.

- **Filter by status:** `+` resolved  `○` open  `✕` contested  `—` archived
- **Search** across all decisions by topic, content, or entity
- **Three lenses:** topic, collaborator, time
- **Thread view** with dissent highlighting -- see where advisors disagreed
- **Keyboard shortcuts:** `J` / `K` to navigate, `1` / `2` / `3` to switch tabs
- **Live updates** -- new decisions appear the moment they're captured
- **Dark and light themes**

&nbsp;

## Decision Trace Format

Each trace is a self-contained JSON file. Minimal example:

```json
{
  "id": "dt-2026-04-07-a3f1",
  "topic": "PLG vs. sales-led for enterprise",
  "thread_status": "resolved",
  "opened_at": "2026-04-07T10:30:00Z",
  "resolved_at": "2026-04-07T11:15:00Z",
  "resolution_summary": "Sales-led for enterprise, PLG for SMB segment",
  "revisit_trigger": "If SMB PLG conversion exceeds 8% by Q3, revisit enterprise approach",
  "nodes": [
    {
      "id": "dn-1",
      "node_type": "intent",
      "author_role": "founder",
      "content": "We need to decide our primary GTM motion for enterprise..."
    },
    {
      "id": "dn-2",
      "node_type": "response",
      "author_role": "war_cabinet_maya",
      "content": "The strongest case against sales-led: your ACV doesn't justify..."
    },
    {
      "id": "dn-3",
      "node_type": "resolution",
      "author_role": "advisor",
      "content": "Decision: Sales-led for enterprise accounts (>$50K ACV)..."
    }
  ]
}
```

Every trace records _what_ was decided, _who_ argued what, _why_ alternatives were rejected, and _when_ to revisit.

&nbsp;

## Privacy

Everything runs on localhost. No data leaves your machine. No accounts, no cloud, no telemetry. Your decisions are yours.

&nbsp;

## Requirements

- Node.js 20+ (or Docker)
- Claude Code or Claude.ai (for the decision engine)

&nbsp;

## License

BSL-1.1
