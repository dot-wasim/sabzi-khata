#!/bin/bash
# ========================================================
# Sabzi Khata (Hussain Foods) — Mac Phone Simulator
# ========================================================
echo "=========================================="
echo " 🥬 Sabzi Khata — Mandi Phone Simulator"
echo "=========================================="
echo "Starting local dev server on Mac..."

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR/frontend"

# Check if port 5173 is already running
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
  echo "⚡ Server already running on port 5173!"
else
  /usr/local/bin/node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 &
  VITE_PID=$!
  sleep 1.5
fi

echo "📱 Opening Mac Simulator at http://localhost:5173..."
open "http://localhost:5173"

echo "------------------------------------------"
echo "✅ Simulator is ready!"
echo "   URL: http://localhost:5173"
echo "   Press Ctrl+C to stop"
echo "------------------------------------------"

if [ -n "$VITE_PID" ]; then
  wait $VITE_PID
fi
