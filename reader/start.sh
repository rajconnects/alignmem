#!/bin/bash
# Alignmem Trace Reader — production startup
# Usage: ./start.sh [PORT]
# Example: ./start.sh 3200

set -e

PORT="${1:-3000}"
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "[alignmem] Installing dependencies..."
npm install --no-audit --no-fund --loglevel=error

echo "[alignmem] Building client..."
npx vite build

echo "[alignmem] Building server..."
npx tsc -p server/tsconfig.json

echo "[alignmem] Starting on http://localhost:$PORT"
NODE_ENV=production PORT="$PORT" node dist/server/index.js
