# Decision Schema Reference

The canonical schema for a decision trace lives in two places at the package root:

- **Human-readable spec:** [`PROTOCOL.md`](../../PROTOCOL.md) — the Alignmink Decision Trace Protocol (DTP) v0.1
- **Machine-readable schema:** [`schema/dtp-v0.1.json`](../../schema/dtp-v0.1.json) — JSON Schema 2020-12

These are the source of truth. Use them when authoring or validating a trace.

For the operational capture flow (when to capture, what to ask, where to write), see [`decision-trace.md`](./decision-trace.md) in this folder.
