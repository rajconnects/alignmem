# Alignmem · Trace Reader

A localhost, journal-style reader for Alignmink decision traces. Not an editor.
Not a strategist. Just a calm surface for **re-reading** what you decided, **tracing
the reasoning** behind it, and **navigating** by topic, collaborator, or recency.

The reader consumes `alignmink-traces/threads/*.json` files captured by the
`decision-trace-capture` Cowork skill. The JSON files **are** the source of truth
— there is no database.

---

## At a glance

| Thing            | Value                                                           |
|------------------|-----------------------------------------------------------------|
| Stack            | Vite + React + TypeScript on the client, Node + Express on the server |
| Storage          | Filesystem only (your trace JSON + `~/.alignmem-reader/`)       |
| Auth             | Single passcode, bcrypt-hashed, signed-cookie session (30 days) |
| Live updates     | `chokidar` file watcher + Server-Sent Events                    |
| Theme            | Dark (default) and light — both WCAG AA                         |
| Runs on          | macOS, Linux, Windows (local only)                              |
| Data leaves host | Never. Only Google Fonts is fetched externally                  |

---

## Requirements

- **Node.js** v20 or later (tested on 20.20.1)
- **npm** v10 or later
- A folder on disk containing `alignmink-traces/threads/*.json`

## Install

```bash
cd apps/alignmem-trace-reader
npm install
```

That's it — no global installs, no Docker, no DB.

## Development (two-process)

In dev mode the Vite client runs on **5173** and the Express API runs on
**3000**. Vite proxies `/api/*` to Express.

```bash
npm run dev
```

This runs both processes concurrently. Open http://localhost:5173 in your
browser. You'll see:

1. **First run:** a passcode-setup screen. Enter any passcode ≥ 6 characters.
   It is bcrypt-hashed and written to `~/.alignmem-reader/.passcode`.
2. **Project picker:** click **BROWSE FOLDER…** and paste the absolute path
   to any folder containing `alignmink-traces/threads/`. Example:
   `/path/to/any/folder/containing/alignmink-traces`
3. **Dashboard:** you'll see cards for every trace JSON, three lenses
   (topic / collaborator / time), and a detail rail on the right.

## Production (single process)

```bash
npm run build   # typechecks + builds client + transpiles server
npm run start   # serves the client + API on http://localhost:3000
```

Port override: `PORT=4000 npm run start`.

## First-time setup flow

```
┌───────────────┐    ┌───────────────────┐    ┌─────────────────┐
│ SET A PASSCODE│ →  │ PICK A PROJECT    │ →  │ DASHBOARD       │
│ ≥ 6 chars     │    │ Browse to folder  │    │ Live-updating   │
│ bcrypt hashed │    │ Must contain      │    │ trace journal   │
│               │    │ alignmink-traces/ │    │                 │
└───────────────┘    │   threads/        │    └─────────────────┘
                     └───────────────────┘
```

On subsequent runs:
- Passcode persists in `~/.alignmem-reader/.passcode`
- Known projects persist in `~/.alignmem-reader/projects.json`
- Cookie-signing secret persists in `~/.alignmem-reader/cookie-secret`
- Session cookie is valid 30 days — you stay unlocked between restarts.

To reset everything, delete `~/.alignmem-reader/`.

## How to use

### Navigating

- **Sidebar lenses.** Click any row under `LENS / TOPIC`, `LENS / COLLABORATOR`,
  or `LENS / TIME` to filter the card list. Exactly one lens row can be active
  at a time; switching lenses resets selection. Click the active row again to
  clear the lens.
- **Status chips.** `ALL / OPEN / RESOLVED / CONTESTED / ARCHIVED` stack on top
  of the main column. Amber chip = active.
- **Search.** Substring match against `topic + resolution_summary`. No semantic
  search, no fuzzy matching.
- **Cards.** Click any card in the main column to load it into the right rail.
  The rail opens on Summary by default.

### Reading a trace (right rail)

Three tabs:

- **SUMMARY** — `resolution_summary`, the revisit trigger (if any) highlighted
  in amber, and tag chips for the category and related topics.
- **THREAD** — all nodes in `sequence_order`, each rendered as a mono eyebrow
  (`INTENT · ARUN · 2026-04-05`) + body text. **Dissent nodes have a red left
  border and red eyebrow**, so minority views visually break the timeline and
  cannot be skimmed past.
- **SESSION** — metadata (session id, captured-at, file path, trace id),
  related topics, a `→ REVEAL IN FOLDER` button, and a collapsible `▸ RAW JSON`
  block.

### Keyboard shortcuts

| Key       | Action                                             |
|-----------|----------------------------------------------------|
| `1`       | Summary tab (only when a trace is selected)        |
| `2`       | Thread tab                                         |
| `3`       | Session tab                                        |
| `J`       | Next card in the current filtered list            |
| `K`       | Previous card                                      |
| `/`       | Focus the search input                             |
| `Esc`     | Clear selection (rail returns to `SELECT A DECISION`) |

Shortcuts are shown as a small hint row at the bottom of the right rail.

### Live updates

The server watches your project's `alignmink-traces/threads/` directory with
`chokidar`. When you (or the capture skill) add/edit/delete a `.json` file, a
debounced Server-Sent Event fires and the UI re-fetches within ~1 second.
Stop the capture skill, edit a file by hand, save it — the dashboard updates
without a refresh. If the stream drops, a red banner appears at the top of
the dashboard and the client auto-reconnects every 3 s.

### Switching projects and locking

- Click **SWITCH PROJECT** in the sidebar footer or the top-right lock button.
- **LOCK ⎋** clears the session cookie and returns to the passcode screen.
- You can re-add previously used projects from the picker without re-typing
  the path.

### Reveal-in-folder behavior

| OS      | Action                                                |
|---------|-------------------------------------------------------|
| macOS   | `open -R <file>` — Finder opens with the file selected |
| Linux   | `xdg-open <dir>` — default file manager opens the folder |
| Windows | `explorer /select, <file>` — Explorer with file selected |

---

## What it does NOT do (by design)

- No editing, creating, merging, or deleting traces from the UI. Writes happen
  in the capture skill.
- No users, roles, sharing, or multi-tenant features.
- No AI summarization, semantic search, embeddings, or vector indexing.
- No cross-project search; one project at a time.
- No notifications, reminders, or revisit-trigger alerts.
- No exports (PDF, Markdown, etc.).
- No analytics, telemetry, or error reporting.

If you want any of those, they belong in a different tool.

---

## Testing

```bash
npm test             # Vitest unit + integration (45 tests)
npm run typecheck    # tsc --noEmit on client + server
npm run lint:brand   # brand-audit: radius, shadow, Zilla Slab rules
npm run test:e2e     # Playwright golden-path (install browsers first)
```

Coverage:
- **Server indexer** (derive, bucketFor, indexProject) — 13 tests
- **Server API** (auth, projects, traces) — 6 tests, exercises the real repo corpus
- **Client filters** (status, search, lens, counts) — 14 tests
- **Client format helpers** (signal characters, duration, card meta) — 12 tests

## Brand rules (enforced by `npm run lint:brand`)

The reader inherits the Alignmink design system from
`Design-System/direction-a-v3.jsx` and `Design-System/alignmink-marketing-design-system-v1.md`.
Three rules are **non-negotiable** and are enforced by a pre-commit-style audit:

1. **Border-radius is 0.** Every card, button, chip, input, tab, dialog.
   The only legal exception is `50%` on `.live-pip` / `.pip` (6 px brand dots).
2. **No shadows.** Depth comes from borders and background tone. `box-shadow:
   none` is allowed in the global reset; any other declaration is a violation.
3. **Zilla Slab is the wordmark only.** It appears in exactly one place in the
   DOM — the `.wordmark-text` class in the topbar. Never in a heading, a tab
   label, or body text.

The audit also exists as a Playwright assertion that checks computed styles
at runtime (see `e2e/golden-path.spec.ts`).

## Signal characters (load-bearing)

These four ASCII characters appear on every card row, the rail header, and list
markers. **Do not substitute icons or emojis.**

| Char | Meaning   | Color           |
|------|-----------|-----------------|
| `+`  | Resolved  | `--green`       |
| `○`  | Open      | `--orange`      |
| `✕`  | Contested | `--red`         |
| `—`  | Archived  | `--text-300`    |

## Accessibility

- WCAG AA contrast verified for dark and light themes (see contrast table in
  `src/styles/direction-a-v3-tokens.css`).
- Every interactive element (cards, chips, tabs, lens rows, rail close) is a
  real `<button>` with a visible keyboard focus ring (2 px amber outline).
- `aria-pressed` and `aria-selected` states on toggleable elements.
- `role="tablist"` + `role="tab"` on the rail tabs; `role="tabpanel"` on the
  content region.
- `aria-live="polite"` on error messages in the login form.
- `@media (hover: hover)` guards around hover states so touch devices don't
  get stuck-hover artefacts.

## Responsive

| Width       | Layout                                                         |
|-------------|----------------------------------------------------------------|
| ≥ 1400 px   | Full shell: 248 + flex + 296                                    |
| 1100–1399   | Full shell, main column narrows, sidebar 232 px                 |
| 820–1099    | Right rail becomes a full-height slide-over (296 px), triggered by card click |
| 600–819     | Sidebar collapses to a 48 px icon rail, rail slides over        |
| < 600       | Single column, sidebar becomes a top sheet, rail full-screen    |

Cards are always 1-up — decision headlines are too dense to read in a grid.

## Directory layout

```
apps/alignmem-trace-reader/
├── README.md                      ← you are here
├── package.json
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── .env.example
├── scripts/
│   └── brand-audit.mjs            ← radius / shadow / Zilla checker
├── server/
│   ├── index.ts                   ← entry point
│   ├── app.ts                     ← Express app factory
│   ├── auth.ts                    ← bcrypt + signed cookie sessions
│   ├── storage.ts                 ← ~/.alignmem-reader filesystem
│   ├── indexer.ts                 ← trace parsing + derived fields
│   ├── watcher.ts                 ← chokidar pool with debounced SSE
│   ├── reveal.ts                  ← OS file-manager opener
│   ├── schema.ts                  ← Zod schemas for DecisionTrace
│   └── __tests__/                 ← vitest + supertest
├── src/
│   ├── main.tsx
│   ├── App.tsx                    ← auth → picker → dashboard router
│   ├── styles/
│   │   └── direction-a-v3-tokens.css   ← verbatim token export
│   ├── lib/
│   │   ├── api.ts                 ← fetch client
│   │   ├── types.ts
│   │   ├── format.ts              ← signal chars, duration, card meta
│   │   ├── filters.ts             ← status/search/lens + counts
│   │   ├── useTraces.ts           ← SWR + SSE hook
│   │   ├── useTheme.ts
│   │   └── __tests__/
│   ├── components/
│   │   ├── Shell-less — raw CSS grid in Dashboard.tsx
│   │   ├── Topbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Main.tsx
│   │   ├── CardRow.tsx
│   │   ├── FilterBar.tsx
│   │   ├── Dashboard.tsx
│   │   ├── RightRail.tsx
│   │   ├── tabs/
│   │   │   ├── SummaryTab.tsx
│   │   │   ├── ThreadTab.tsx
│   │   │   └── SessionTab.tsx
│   │   ├── screens/
│   │   │   ├── Login.tsx
│   │   │   └── ProjectPicker.tsx
│   │   └── primitives/
│   │       └── Tag.tsx
│   └── assets/
│       └── MinkMark.tsx           ← brand SVG
└── e2e/
    └── golden-path.spec.ts
```

## Troubleshooting

**I forgot my passcode.**
Delete `~/.alignmem-reader/.passcode` and restart the server. You'll be
prompted to set a new one on next load.

**"alignmink-traces/threads/ not found in the selected folder"**
You need to point the picker at the **parent folder** — the one that
*contains* `alignmink-traces/threads/`. In this monorepo, that's the repo
root, not the `alignmink-traces/` directory.

**Ports 3000 or 5173 are already in use.**
- Dev: Vite will error if 5173 is busy (`strictPort: true`). Kill the other
  process or change the port in `vite.config.ts`.
- Prod: `PORT=4000 npm run start` uses a different port.

**Changes to trace files are not reflected in the UI.**
1. Check the red banner at the top of the sidebar — if it says "LIVE WATCHER
   DISCONNECTED", wait 3 seconds for auto-reconnect.
2. Confirm the file has a `.json` extension (hidden files and `.DS_Store` are
   ignored).
3. Confirm the file parses as a valid `DecisionTrace` against
   `server/schema.ts`. Invalid files are skipped and surfaced via an
   orange banner.

**Cookie errors after restarting the server in dev.**
The cookie secret is stable between restarts (stored in
`~/.alignmem-reader/cookie-secret`), so this should not happen. If it does,
clear the site cookies for `localhost:5173` and `localhost:3000`.

**Tests fail with `mime-db/db.json: Unexpected end of JSON input`.**
A dependency file got truncated mid-install. Run `rm -rf node_modules
package-lock.json && npm install` to recover.

**`→ REVEAL IN FOLDER` does nothing on Linux.**
`xdg-open` is required. Install `xdg-utils` via your package manager.

## Configuration reference

Environment variables (all optional, read from `.env` or the shell):

| Variable           | Default                          | Purpose                                 |
|--------------------|----------------------------------|-----------------------------------------|
| `PORT`             | `3000`                           | Express server port                     |
| `PASSCODE`         | *(unset)*                        | Bypass the bcrypt file; if set, this value is the passcode |
| `COOKIE_SECRET`    | auto-generated                   | Session cookie signing secret           |
| `ALIGNMEM_HOME`    | `~/.alignmem-reader`             | State directory (passcode, projects, secret) |
| `NODE_ENV`         | `development`                    | When `production`, Express serves `dist/client` |

## Data contract (read-only)

The reader consumes the canonical `DecisionTrace` schema. It does not define
its own. See `server/schema.ts` for the Zod definition.

```ts
type DecisionTrace = {
  id: string
  topic: string
  status: 'open' | 'resolved' | 'contested' | 'archived'
  category: string
  project: string
  session_id: string
  opened_at: string        // ISO
  resolved_at: string | null
  resolution_summary: string | null
  revisit_trigger: string | null
  outcome: string | null
  outcome_assessed_at: string | null
  captured_at: string
  nodes: Array<{
    id: string
    node_type: 'intent' | 'response' | 'question' | 'resolution' | 'dissent'
    author_role: 'founder' | 'advisor' | 'board' | 'cofounder' | 'other'
    author_name: string
    content: string
    context: { source: string; session: string; related_topics: string[] }
    sequence_order: number
    created_at: string
  }>
}
```

The indexer computes these derived fields on load, never writes them to disk:

- `participants` — unique `author_name`s across nodes
- `turn_count` — `nodes.length`
- `duration_days` — `resolved_at - opened_at` (null if still open)
- `age_bucket` — `7d | 14d | 30d | older`, relative to today
- `topic_tags` — `category` plus every `related_topics` entry, deduplicated

## Security notes

- Passcodes are bcrypt-hashed with 12 salt rounds; the raw passcode is never
  persisted.
- Session cookies are signed with a 32-byte random secret (generated on first
  run), `httpOnly`, `sameSite: lax`.
- Every API endpoint except `/api/auth/*` requires a valid session.
- All shell commands (`open`, `xdg-open`, `explorer`) use `spawn` with an
  argument array — no string interpolation, safe against paths with spaces
  or quotes.
- No external network calls except Google Fonts.
- `.passcode`, `cookie-secret`, and `projects.json` are written with mode
  `0600`.
