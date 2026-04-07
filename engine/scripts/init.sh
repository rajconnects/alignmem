#!/usr/bin/env bash
# Alignmem Decision Engine — Directory Bootstrapper
# Creates the trace storage directory structure in the user's workspace.
#
# Usage:
#   ./init.sh [target-directory] [trace-dir-name]
#
# If no target directory is provided, creates alignmink-traces/ in the
# current working directory.
# If no trace directory name is provided, defaults to 'alignmink-traces'.

set -euo pipefail

TRACE_DIR_NAME="${2:-alignmink-traces}"
TRACE_DIR="${1:-$(pwd)}/$TRACE_DIR_NAME"

echo "Alignmem Decision Engine — Initializing trace storage"
echo "Target: $TRACE_DIR"
echo ""

# Create directory structure
mkdir -p "$TRACE_DIR/threads"
mkdir -p "$TRACE_DIR/sessions"

# Create DECISIONS.md if it doesn't exist
if [ ! -f "$TRACE_DIR/DECISIONS.md" ]; then
    cat > "$TRACE_DIR/DECISIONS.md" << 'TEMPLATE'
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
TEMPLATE
    echo "✓ Created DECISIONS.md"
else
    echo "· DECISIONS.md already exists, skipping"
fi

echo ""
echo "✓ Trace storage initialized at: $TRACE_DIR"
echo "  threads/   — one JSON file per decision"
echo "  sessions/  — one JSON file per skill session"
echo ""
echo "Ready to capture decisions."
