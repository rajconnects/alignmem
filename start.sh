#!/bin/bash
# Alignmem — Quick Start
# Usage: ./start.sh [PORT]
# Captures and visualizes your strategic decisions locally.

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        alignmem · trace reader       ║"
echo "  ║   Every decision leaves a trace.     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# On first run, pre-seed the samples project so the dashboard
# shows demo traces immediately without manual folder picking.
ALIGNMEM_HOME="${ALIGNMEM_HOME:-$HOME/.alignmem-reader}"
PROJECTS_FILE="$ALIGNMEM_HOME/projects.json"
SAMPLES_DIR="$DIR/samples"

if [ ! -f "$PROJECTS_FILE" ] && [ -d "$SAMPLES_DIR/alignmink-traces/threads" ]; then
  mkdir -p "$ALIGNMEM_HOME"
  cat > "$PROJECTS_FILE" <<SEED
[{"name":"samples","path":"$SAMPLES_DIR","last_seen":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","trace_count":3}]
SEED
  echo "[alignmem] Pre-loaded sample decisions for first run."
fi

# Start the reader
cd "$DIR/reader"
exec bash start.sh "${1:-3000}"
