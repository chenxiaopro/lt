#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT/backend"
node server.js &
BACKEND_PID=$!

cd "$ROOT/frontend"
npm run dev

trap "kill $BACKEND_PID" EXIT
