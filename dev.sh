#!/usr/bin/env bash
# Start both dev servers for local development.
# Usage: ./dev.sh
#
# Prerequisites:
#   - npm ci in client/ and workers/tarot-api/
#   - Copy workers/tarot-api/.dev.vars.example -> .dev.vars and add API keys

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Check prerequisites
if [ ! -d "$ROOT/client/node_modules" ]; then
    echo "Installing client dependencies..."
    (cd "$ROOT/client" && npm ci)
fi

if [ ! -d "$ROOT/workers/tarot-api/node_modules" ]; then
    echo "Installing worker dependencies..."
    (cd "$ROOT/workers/tarot-api" && npm ci)
fi

if [ ! -f "$ROOT/workers/tarot-api/.dev.vars" ]; then
    echo "WARNING: workers/tarot-api/.dev.vars not found!"
    echo "Copy .dev.vars.example -> .dev.vars and add your API keys."
    echo ""
fi

echo "Starting Tarot Oracle dev environment..."
echo "  Client: http://localhost:3000/tarot/"
echo "  Worker: http://localhost:8787"
echo ""

# Start wrangler in background
(cd "$ROOT/workers/tarot-api" && npx wrangler dev --port 8787) &
WRANGLER_PID=$!

# Start vite in foreground
(cd "$ROOT/client" && npx vite --port 3000) &
VITE_PID=$!

# Clean up on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $WRANGLER_PID 2>/dev/null || true
    kill $VITE_PID 2>/dev/null || true
    wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# Wait for either to exit
wait
