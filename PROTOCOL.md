# Alignmink Decision Trace Protocol (DTP) v0.1

**Status:** v0.1.0 — initial public draft.
**License:** Apache 2.0.
**Schema file:** [`schema/dtp-v0.1.json`](./schema/dtp-v0.1.json) (JSON Schema 2020-12).

---

## §1. Purpose & Scope

DTP v0.1 specifies how a leadership decision is serialized to JSON so that:

- Any reader can consume any producer's traces without coordination.
- A user can walk away from one tool and take their traces to another without data loss.
- Decisions remain intelligible in 5, 10, 20 years — human-readable JSON, open spec, versioned.

### 1.1 In scope
- Canonical JSON shape of a single trace
- Relations between traces (edges)
- Session metadata (optional)
- Versioning and extensibility rules
- File layout on disk (recommended)

### 1.2 Out of scope
- Reader UI, rendering, or interaction patterns
- Capture skill prompts or behavior
- Network protocols, sync, or sharing (DTP is a file format, not a transport)
- Authentication, encryption at rest
- Agent execution traces, model outputs, or tool-call logs

---

## §2. Normative Language

The key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** are interpreted per RFC 2119.

---

## §3. Core Entities

### 3.1 Trace
The atomic unit. A single decision captured with full reasoning, alternatives, author, and lifecycle metadata. Every trace is self-contained — no external lookups required to interpret it.

### 3.2 Thread
A virtual grouping of related traces over time, identified by a shared `thread_id`. Threads are implicit from trace references; a thread metadata file MAY exist but is OPTIONAL.

### 3.3 Session
The capture session in which one or more traces were created. Records the conversation surface (AI tool), date, participants, and trace IDs captured.

### 3.4 Edges
Typed directed relations between traces. Edges live inside a trace's `edges` array and reference other traces by `target_trace_id`.

| Edge type | Meaning | Direction |
|-----------|---------|-----------|
| `supersedes` | This trace replaces a prior decision. | Source replaces Target. |
| `contradicts` | This trace conflicts with a prior resolved decision. | Flagged for review; not auto-resolved. |
| `depends_on` | This trace requires the target decision to hold. | Source depends on Target. |
| `enables` | This trace makes the target decision possible. | Source enables Target. |
| `revisits` | This trace reopens a prior deferred or resolved decision. | Source revisits Target. |
| `extends` | This trace expands scope of a prior one without replacing it. | Source extends Target. |

Producers MUST use the controlled vocabulary above. New edge types require a minor protocol version bump.

---

## §4. Canonical JSON Shape

A complete DTP v0.1 trace, with all fields shown for illustration. Required fields are marked in §5.

```json
{
  "schema_version": "0.1.0",
  "trace_id": "2026-04-24-pricing-staged-beta",
  "thread_id": "pricing-strategy",
  "session_id": "sess-2026-04-24-afternoon",
  "title": "Stage beta pricing at $50/mo",
  "captured_at": "2026-04-24T14:32:18Z",
  "captured_via": "claude-code",
  "author": {
    "name": "Arun Raj",
    "role": "ceo",
    "id": "arun-raj"
  },
  "decision": {
    "statement": "Beta pricing will be $50/month for the first 5 users.",
    "reasoning": "Keeps the economics justifying manual support while proving willingness to pay.",
    "alternatives": [
      {
        "option": "$20/mo + $50 setup fee",
        "rejected_because": "Setup fee introduces friction in a 5-user beta where we want feedback volume."
      }
    ]
  },
  "themes": ["pricing", "beta", "unit-economics"],
  "revisit_triggers": ["User count exceeds 5"],
  "confidence": 0.75,
  "impact": "high",
  "status": "resolved",
  "edges": [
    {
      "type": "supersedes",
      "target_trace_id": "2026-04-08-v1-pricing-hypothesis"
    }
  ],
  "attachments": [
    {
      "kind": "url",
      "value": "https://docs.google.com/document/d/abc/edit",
      "description": "Customer interview transcript"
    }
  ],
  "outcome": {
    "observed_at": null,
    "observation": null,
    "success": null
  },
  "extensions": {}
}
```

---

## §5. Field Specifications

### 5.1 Top-level fields

The required set is deliberately minimal. A valid v0.1 trace needs only six fields. Everything else is optional but recommended.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `schema_version` | string | **YES** | MUST equal `"0.1.0"` for this version. |
| `trace_id` | string | **YES** | Unique per author. Pattern: `^\d{4}-\d{2}-\d{2}-[a-z0-9-]{1,80}$`. |
| `title` | string | **YES** | 1–120 chars. Display headline, plain text. |
| `captured_at` | string (ISO 8601) | **YES** | MUST include explicit timezone designator: `Z` (UTC) or numeric offset like `-07:00`. Local time without offset is NOT valid. |
| `author` | object | **YES** | See §5.2. |
| `decision` | object | **YES** | See §5.3. |
| `thread_id` | string | OPTIONAL | Slug-cased (`[a-z0-9-]+`), 1–80 chars. If omitted, the trace is standalone. |
| `session_id` | string | OPTIONAL | Reference to a session file. |
| `captured_via` | string (enum) | OPTIONAL | One of: `claude-code`, `claude-chat`, `cowork`, `chatgpt`, `cli-direct`, `other`. Default: `other`. |
| `status` | string (enum) | OPTIONAL | One of: `open`, `resolved`, `contested`, `deferred`, `superseded`. Default: `open`. |
| `themes` | array<string> | OPTIONAL | Stakeholder-oriented grouping (see §5.6). 0–10 items; each 1–40 chars. |
| `content_hash` | string | OPTIONAL | `sha256:<64-char-lowercase-hex>`. See §6. |
| `revisit_triggers` | array<string> | OPTIONAL | Plain-English conditions that would re-open this decision. 0–10 items. |
| `confidence` | number | OPTIONAL | Range `0.0` to `1.0` inclusive. Author's self-assessed confidence. |
| `impact` | string (enum) | OPTIONAL | One of: `low`, `medium`, `high`, `critical`. Author's expected impact at capture time. |
| `edges` | array<object> | OPTIONAL | See §5.4. |
| `attachments` | array<object> | OPTIONAL | See §5.5. Links to supporting material. |
| `outcome` | object | OPTIONAL | See §5.7. All fields MAY be null at capture. |
| `extensions` | object | OPTIONAL | See §7. Namespaced vendor fields. |

### 5.2 Author object

```json
{
  "name": "string (1–80 chars, required)",
  "role": "string (required)",
  "id": "string (optional)"
}
```

- `name` — human-readable. Required.
- `role` — free-form string with a recommended controlled vocabulary: `ceo`, `founder`, `coo`, `cpo`, `cto`, `cfo`, `vp_product`, `vp_sales`, `vp_eng`, `chief_of_staff`, `advisor`, `team_member`. Producers MAY use custom roles.
- `id` — stable identifier chosen by the user. OPTIONAL.

### 5.3 Decision object

```json
{
  "statement": "string (1–500 chars, required)",
  "reasoning": "string (1–4000 chars, required)",
  "alternatives": [ /* array of Alternative objects, 0–10 items, required */ ]
}
```

- `statement` — single-sentence commitment. Plain text.
- `reasoning` — why this decision was made. Multi-paragraph allowed.
- `alternatives` — array of what was considered and rejected. Empty array is valid but discouraged.

#### 5.3.1 Alternative object

```json
{
  "option": "string (1–300 chars, required)",
  "rejected_because": "string (1–1000 chars, required)"
}
```

### 5.4 Edge object

```json
{
  "type": "string (enum, required)",
  "target_trace_id": "string (required)",
  "note": "string (0–500 chars, optional)"
}
```

Edge `type` MUST be one of the six values defined in §3.4. Readers SHOULD surface `contradicts` edges prominently.

### 5.5 Attachment object

```json
{
  "kind": "string (enum, required)",
  "value": "string (required)",
  "description": "string (0–200 chars, optional)"
}
```

- `kind` — one of: `url`, `file_path`, `inline_text`.
- `value` — the attachment content (URL string, file path string, or inline text up to 4000 chars).
- `description` — optional human-readable label.

DTP does NOT validate URL reachability or file existence at capture time. Attachments are user-curated references; broken references are a user concern, not a protocol concern.

### 5.6 Themes (stakeholder-oriented)

`themes` is the **stakeholder audience** field — who this decision affects or who influenced it. Distinct from a Topic lens, which groups by subject matter.

- **Topic** answers "what is this decision about?" (pricing, hiring, positioning)
- **Theme** answers "who does this decision concern?" (board, investors, customers, team, suppliers)

Recommended starter vocabulary (free-form; producers MAY extend):

`board`, `investors`, `customers`, `team`, `hiring`, `suppliers`, `partners`, `regulators`, `media`, `competitors`, `internal`, `legal`, `finance`

A trace MAY have zero themes.

### 5.7 Outcome object

```json
{
  "observed_at": "string (ISO 8601) | null",
  "observation": "string (0–2000 chars) | null",
  "success": "boolean | null"
}
```

All three fields MAY be null at capture. The author fills them later via the reader. An outcome with all-null fields is valid and indicates "outcome not yet assessed."

---

## §6. Content Hash (optional at v0.1)

### 6.1 What it is

A SHA-256 fingerprint over a canonical serialization of the trace's core fields. Same content → same fingerprint. Tampered content → different fingerprint.

Three uses:
- **Dedup:** same decision captured twice produces the same hash.
- **Integrity:** modification of hashed fields produces a different hash.
- **Cross-tool matching:** two readers consuming the same trace compute the same hash.

### 6.2 Why optional at v0.1

At v0.1 there is one canonical producer (alignmink-dtp). Dedup and cross-tool matching are weak needs until a second implementation exists. Producers that want to future-proof MAY include the hash now.

### 6.3 How it is computed

SHA-256 of the canonical JSON serialization of these fields, in this exact order:

1. `trace_id`
2. `title`
3. `captured_at`
4. `author.name`
5. `author.role`
6. `decision.statement`
7. `decision.reasoning`
8. `decision.alternatives`

#### Canonical JSON rules
- Field names in objects MUST be sorted alphabetically.
- No whitespace between tokens.
- UTF-8 encoding.
- Unicode text in NFC form.
- Numbers in shortest decimal representation.
- Booleans and nulls lowercase.
- Arrays preserve insertion order.

### 6.4 Reader behavior on mismatch

If `content_hash` is present and does not match the recomputed value:
- Readers MUST NOT refuse to display the trace (resilience over rigidity).
- Readers SHOULD warn the user with a visible indicator.
- Readers MAY offer a "recompute and repair" action.

If `content_hash` is absent, no verification is performed.

---

## §7. Extensibility

### 7.1 The extensions object

Producers MAY add vendor-specific fields under `extensions`, namespaced by reverse-DNS:

```json
"extensions": {
  "com.alignmink.war-cabinet": {
    "conversation": [
      { "role": "war_cabinet_priya", "content": "...", "sequence": 1 }
    ]
  },
  "com.somevendor.toolx": {
    "custom_field": "..."
  }
}
```

### 7.2 Rules

- Extension namespaces MUST follow reverse-DNS format (`com.vendor.name`).
- Extensions MUST NOT duplicate or override core fields.
- Readers that do not recognize an extension MUST preserve it on round-trip.
- Extensions MUST be optional — removing one MUST NOT break core validation.
- If an extension's data becomes important enough to standardize, it SHOULD be proposed for inclusion in the next minor protocol version.

### 7.3 Reserved namespaces

- `com.alignmink.*` — reserved for Alignmink (capture skills, future surfaces).
- `org.w3.prov.*` — reserved for W3C PROV alignment fields (§9).

---

## §8. Versioning

SemVer applies at the protocol level.

- **MAJOR** (`1.0.0` → `2.0.0`) — breaking changes to required fields, enums, semantics.
- **MINOR** (`0.1.0` → `0.2.0`) — additive: new optional fields, new enum values with backward-compat defaults.
- **PATCH** (`0.1.0` → `0.1.1`) — clarifications to spec text; no JSON shape changes.

### 8.1 Reader compatibility rules

- Readers MUST declare the maximum protocol version they support.
- Reading a higher patch/minor version: ignore unknown fields, SHOULD warn.
- Reading a higher major version: SHOULD refuse to render or warn prominently.
- Readers SHOULD preserve unknown fields on round-trip save.

### 8.2 Producer guidance

Producers SHOULD emit the oldest compatible version that preserves semantic content. At launch: `0.1.0` for all surfaces.

---

## §9. W3C PROV Alignment (non-normative)

DTP aligns loosely with W3C PROV-O for standards interop. PROV tooling is not required to use DTP. Implementers MAY emit a parallel PROV-O representation under `extensions.org.w3.prov`.

| DTP concept | PROV-O counterpart |
|-------------|--------------------|
| `trace` | `prov:Activity` |
| `author` | `prov:Agent` |
| `decision.reasoning` | `prov:wasInfluencedBy` (informal) |
| `edges.supersedes` | `prov:wasRevisionOf` |
| `edges.depends_on` | `prov:wasDerivedFrom` |
| `edges.enables` | `prov:used` (inverse) |
| `captured_at` | `prov:generatedAtTime` |

---

## §10. File Layout on Disk (recommended)

### 10.1 Default root

```
~/alignmink-traces/
├── traces/
│   └── <trace_id>.json            # one file per trace — source of truth
├── sessions/
│   └── <session_id>.json          # one file per capture session (optional)
├── threads/                       # OPTIONAL — thread metadata files
│   └── <thread_id>.json           # only if a thread needs a display name
└── .alignmink-dtp/
    └── config.json                # reader-local config
```

### 10.2 Root path discovery

Readers resolve the root path via (in precedence order):
1. `ALIGNMINK_TRACES_DIR` environment variable.
2. `--dir <path>` CLI flag.
3. Reader's local config file.
4. Default: `~/alignmink-traces/`.

### 10.3 Session file shape

```json
{
  "schema_version": "0.1.0",
  "session_id": "sess-2026-04-24-pricing",
  "context": "Weekly strategy review — pricing model re-examination",
  "date": "2026-04-24",
  "captured_via": "claude-code",
  "participants": [
    { "name": "Arun Raj", "role": "ceo" },
    { "name": "Claude", "role": "advisor" }
  ],
  "trace_ids": ["2026-04-24-pricing-staged-beta"],
  "summary": "Shifted beta pricing from per-build to staged subscription.",
  "created_at": "2026-04-24T14:30:00Z",
  "updated_at": "2026-04-24T14:45:00Z"
}
```

---

## §11. Conformance

A trace is **DTP v0.1 conformant** if and only if it:
1. Validates against [`schema/dtp-v0.1.json`](./schema/dtp-v0.1.json).
2. If `content_hash` is present, that hash matches the recomputed value per §6.
3. Uses only controlled-vocabulary values for `status`, `captured_via`, and `edges[].type`.
4. Places all vendor-specific fields under `extensions.<reverse-dns>`.

A reader is **DTP v0.1 conformant** if and only if it:
1. Renders all traces validating against the JSON Schema.
2. Surfaces `contradicts` edges visibly.
3. Preserves unknown `extensions` on round-trip write.
4. Honors the version compatibility rules in §8.1.

---

## §12. Why these architectural choices

### Why trace-centric?
Earlier drafts wrapped everything inside a "thread" with nested "nodes" representing back-and-forth utterances. v0.1 inverts: **a trace is the unit.** One decision, one file. Multi-advisor conversations live in extensions, preserved but not required to read the decision itself.

### Why minimal required fields?
Only six fields are required: `schema_version`, `trace_id`, `title`, `captured_at`, `author`, `decision`. A producer can write a valid trace with little ceremony; a reader can display any trace without worrying about missing fields.

### Why stakeholder-oriented themes?
Topics already answer "what is this about?" (pricing, hiring). Themes answer a different question: **who does this decision affect?** (board, investors, customers, team).

### Why optional content hash?
At v0.1 with one producer, dedup and cross-tool matching are weak needs. Spec-required fields that get ignored erode trust; better to add the hash as REQUIRED later when there's a real need.

### Why free-text revisit triggers?
Plain English ("when user count exceeds 5") is what people write naturally. Structured triggers (metric + threshold + comparator) require forms and a metric catalog. Free text is good; structure can come later without breaking existing traces.

---

## §13. Open Questions for v0.2

Not blocking v0.1.

1. **Team-share edges.** When a `share` mechanism ships, introduce edge type `shared_with` or a separate `sharing` object?
2. **Soft-deprecation.** v0.1 has no in-place redaction. v0.2 candidate: a `deprecated` field (timestamp + reason) — trace stays on disk, dimmed in the reader.
3. **Themes vocabulary.** May evolve to a recommended controlled vocabulary if cross-user search becomes relevant.

---

## §14. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-04-25 | Initial public draft. |

---

**License:** Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
**Contributions:** Issues and PRs welcome at https://github.com/rajconnects/alignmink-dtp.
