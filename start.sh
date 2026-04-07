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

# Start the reader
cd "$DIR/reader"
exec bash start.sh "${1:-3000}"
