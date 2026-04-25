#!/bin/bash
# Decision Journal — quick start for users who cloned the repo.
# Usage: ./start.sh [PORT]
#
# Equivalent to `npx alignmink-dtp start` but adds:
#   - timestamp-based caching so warm reboots skip untouched build steps
#   - first-run pre-seeding of the samples project so the dashboard
#     shows demo decisions without manual folder picking
#
# For npm-installed users, prefer: npx alignmink-dtp start

set -e

PORT="${1:-3000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║          Decision Journal            ║"
echo "  ║      alignmink-dtp · DTP v0.1        ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# 1. Install deps only if node_modules is missing or lockfile changed
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "[decision-journal] Installing dependencies..."
  npm ci --no-audit --no-fund --loglevel=error
else
  echo "[decision-journal] Dependencies up to date, skipping install."
fi

# 2. Rebuild client only if sources are newer than dist/client
CLIENT_SOURCES="src index.html vite.config.ts tsconfig.json package-lock.json"
if [ ! -d dist/client ] || [ -n "$(find $CLIENT_SOURCES -newer dist/client 2>/dev/null | head -n 1)" ]; then
  echo "[decision-journal] Building client..."
  npx vite build
else
  echo "[decision-journal] Client build up to date, skipping."
fi

# 3. Rebuild server only if sources are newer than dist/server
SERVER_SOURCES="server/tsconfig.json package-lock.json"
if [ ! -d dist/server ] \
   || [ -n "$(find server -name '*.ts' -not -path 'server/__tests__/*' -newer dist/server 2>/dev/null | head -n 1)" ] \
   || [ -n "$(find $SERVER_SOURCES -newer dist/server 2>/dev/null | head -n 1)" ]; then
  echo "[decision-journal] Building server..."
  npx tsc -p server/tsconfig.json
else
  echo "[decision-journal] Server build up to date, skipping."
fi

# 4. First-run: pre-seed the samples project so the dashboard
#    has demo decisions without manual folder picking.
ALIGNMEM_HOME="${ALIGNMEM_HOME:-$HOME/.alignmem-reader}"
PROJECTS_FILE="$ALIGNMEM_HOME/projects.json"
SAMPLES_DIR="$DIR/samples"

if [ ! -f "$PROJECTS_FILE" ] && [ -d "$SAMPLES_DIR/alignmink-traces/threads" ]; then
  mkdir -p "$ALIGNMEM_HOME"
  cat > "$PROJECTS_FILE" <<SEED
[{"name":"samples","path":"$SAMPLES_DIR","last_seen":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","trace_count":3}]
SEED
  echo "[decision-journal] Pre-loaded sample decisions for first run."
fi

# 5. Boot via the CLI so behavior matches `npx alignmink-dtp start`.
exec node bin/alignmink-dtp.mjs start --port "$PORT" --no-open
