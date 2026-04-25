# Alignmem Decision Engine

A modular strategic decision engine for founders and leaders. Provides specialized strategy skills (War Cabinet, more coming) with a shared Decision Trace Protocol that captures every decision as a structured, graph-ready trace.

## What It Does

- **War Cabinet** — Convenes a 5-advisor panel to stress-test strategic decisions before you commit
- **Decision Trace** — Captures what you decided, why, who pushed back, and what would make you revisit it
- **Graph-Ready** — Decisions link to each other (depends on, supersedes, contradicts) forming a traversable context graph
- **Queryable** — Ask "what did I decide about X?", "show me open decisions", "have I contradicted myself?"

## Install

### Claude Code (GitHub)

```bash
# Clone into your .claude/skills/ directory
git clone https://github.com/rajconnects/alignmem.git .claude/skills/alignmem-decision-engine
```

Or add to your Claude Code project:

```bash
# From your project root
git submodule add https://github.com/rajconnects/alignmem.git .claude/skills/alignmem-decision-engine
```

### Manual

Copy the entire `alignmem-decision-engine/` folder into your `.claude/skills/` directory.

## Quick Start

### Run a War Cabinet session

```
"Convene the cabinet on whether we should pivot from PLG to sales-led"
```

### Log a decision directly

```
"Log this decision: We're hiring a VP Sales before Q3"
```

### Query past decisions

```
"What did we decide about go-to-market?"
"Show me open decisions"
"What's deferred?"
"Have I contradicted a previous decision?"
```

## File Structure

```
alignmem-decision-engine/
├── SKILL.md                    ← Main entry point (loads automatically)
├── core/
│   ├── decision-trace.md       ← Shared capture protocol
│   └── decision-schema.md      ← JSON schema
├── skills/
│   ├── war-cabinet.md          ← War Cabinet skill
│   └── [your-skill].md        ← Drop new skills here
└── scripts/
    └── init.sh                 ← Directory bootstrapping
```

## Adding a New Skill

1. Create `skills/{skill-name}.md`
2. Define trigger phrases, workflow, and architectural trigger (when a decision is produced)
3. Include a handoff section mapping your skill's output to the decision schema
4. The engine's router picks it up automatically

See `ARCHITECTURE.md` for the full integration contract and a worked example.

## Decision Storage

Traces are stored locally in your workspace:

```
alignmink-traces/
├── DECISIONS.md                ← Human-readable index
├── threads/
│   └── 2026-03-30-topic.json  ← One file per decision
└── sessions/
    └── 2026-03-30-session.json ← One file per skill session
```

## Privacy

Runs entirely locally. Nothing leaves your machine unless you explicitly sync to Supabase or push to a remote.

Add `alignmink-traces/` to your `.gitignore` if you don't want decision traces in version control.

## License

Business Source License 1.1 (BSL-1.1). See LICENSE file for details.
