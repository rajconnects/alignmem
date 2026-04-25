# Cursor / Windsurf — DTP capture rules

Append to your project's `.cursorrules` (or save as a separate `.cursorrules-alignmink-dtp` file and merge manually).

```
# Alignmink Decision Trace Capture (DTP v0.1)

When the user makes a strategic decision in conversation — pricing,
hiring, positioning, scope, partnerships — detect the moment and offer
to capture it as a Decision Trace Protocol (DTP) v0.1 trace.

EXPLICIT TRIGGERS (capture without asking):
- "Log this decision: ..."
- "Capture this: ..."
- "Save this as a trace: ..."

IMPLICIT TRIGGERS (ask first: "Capture this as a decision trace?"):
- User commits to a course of action ("I've decided", "we're going with")
- Extended discussion converges on a single outcome
- A "should I X or Y?" reaches a conclusion

REQUIRED FIELDS (DTP v0.1):
schema_version, trace_id, title, captured_at, author, decision
{ statement, reasoning, alternatives[{ option, rejected_because }] }

OPTIONAL FIELDS:
themes (stakeholder-oriented: board / investors / customers / team /
suppliers), revisit_triggers (plain-English conditions),
impact (low | medium | high | critical), captured_via ("cursor")

WRITE PATH:
Use the file_write tool to save the trace as JSON to:
  ~/alignmink-traces/threads/<trace_id>.json

NEVER:
- Capture casual remarks, tactical tasks, or hypotheticals as traces
- Invent alternatives the user didn't articulate — ask
- Save silently — confirm first
- Include the conversation transcript in the trace; only the distilled decision

PROTOCOL SPEC:
https://github.com/rajconnects/alignmink-dtp/blob/main/PROTOCOL.md
```

After installing, restart Cursor so the rules take effect.
