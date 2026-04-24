#!/bin/bash
# Decision Journal — production startup
# Usage: ./start.sh [PORT]
# Example: ./start.sh 3200

set -e

PORT="${1:-3000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

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

echo "[decision-journal] Starting on http://localhost:$PORT"
NODE_ENV=production PORT="$PORT" node dist/server/index.js
