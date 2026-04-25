# alignmink-dtp

> Your decisions deserve a durable form.

You make dozens of strategic decisions inside AI conversations — pricing pivots, hiring calls, market bets. Then the conversation ends, and the reasoning disappears. Three months later, you remember *what* you decided but not *why*.

**alignmink-dtp** is a free, local-first utility for capturing those decisions as structured traces and reading them back in a journal-style interface. The capture skill runs inside Claude. The Decision Journal reader runs on your machine. Nothing leaves localhost.

Traces conform to the **Alignmink Decision Trace Protocol (DTP) v0.1** — an open schema you can walk away with at any time.

---

## 60-second quickstart

```bash
git clone https://github.com/rajconnects/alignmink-dtp.git
cd alignmink-dtp
./start.sh
```

Open [http://localhost:3000](http://localhost:3000). Set a passcode. Point the reader at any folder containing `alignmink-traces/threads/*.json`. Sample decisions are pre-seeded.

Works with [Docker](#docker) too.

---

## What you get

- **Decision Journal reader** — localhost Node + React app that watches your traces folder and renders decisions as scannable cards with topic / collaborator / time browse lenses.
- **Core capture skill** — Claude Code skill that detects decision moments in conversation and prompts capture as DTP-conformant JSON.
- **Enabler skills (bundled, optional)** — War Cabinet (5-advisor pre-commitment panel) and Feedback Panel (post-commitment reflection). Not essential to DTP; useful starter content.
- **DTP v0.1 schema** — open, Apache-2.0-licensed JSON schema. Read [`PROTOCOL.md`](./PROTOCOL.md) for the spec.
- **Sample traces** — 3-4 realistic decisions loaded on first run so the UI has something to show.

---

## Supported surfaces

| Surface | Capture quality | Install |
|---|---|---|
| **Claude Code** | ✅ Premier — silent, zero overhead | `npx alignmink-dtp install-skills` |
| **Cursor / Windsurf** | ✅ Direct | `npx alignmink-dtp install-skills --target=cursor` |
| **Claude Cowork** | ⚠️ Download JSON + upload to reader | Custom instructions block |
| **Claude Chat** | ⚠️ Download JSON + upload | Custom instructions block |
| **ChatGPT** | ⚠️ Download JSON + upload | Custom instructions block |
| **CLI (non-AI fallback)** | ✅ Direct | `npx alignmink-dtp capture` |

---

## Docker

```bash
git clone https://github.com/rajconnects/alignmink-dtp.git
cd alignmink-dtp
docker compose up
```

---

## How capture works

1. You have a strategic conversation in Claude.
2. The core skill detects a decision moment and asks whether to capture it.
3. You confirm; Claude produces DTP-conformant JSON and writes it to your traces folder.
4. The Decision Journal renders the new trace the moment it lands.

Nothing phones home. No analytics. No accounts.

---

## What a trace looks like

Minimal DTP v0.1 trace:

```json
{
  "schema_version": "0.1.0",
  "trace_id": "2026-04-24-pricing-staged-beta",
  "title": "Stage beta pricing at $50/mo",
  "captured_at": "2026-04-24T14:32:18Z",
  "author": { "name": "Arun Raj", "role": "ceo" },
  "decision": {
    "statement": "Beta pricing will be $50/month for the first 5 users.",
    "reasoning": "Keeps the economics justifying manual support while proving willingness to pay.",
    "alternatives": [
      {
        "option": "$20/mo + $50 setup fee",
        "rejected_because": "Setup fee introduces friction in a 5-user beta."
      }
    ]
  },
  "themes": ["pricing", "beta", "unit-economics"],
  "revisit_triggers": ["User count exceeds 5"]
}
```

Every trace captures *what* was decided, *why*, what else was considered, and the condition that would reopen the call. Full field reference in [`PROTOCOL.md`](./PROTOCOL.md).

---

## Requirements

- **Node.js 20+** (or Docker)
- **Claude Code / Claude Chat / ChatGPT / any AI surface** for capture
- **A folder** to hold your traces — any folder on disk

---

## Privacy

Everything runs on localhost. No data leaves your machine. No accounts, no cloud, no telemetry. Your reasoning is your IP.

---

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE).

The Alignmink Decision Trace Protocol (DTP) v0.1 is an open standard. Implementations by others are encouraged and supported.
