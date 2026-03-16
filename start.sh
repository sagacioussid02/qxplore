#!/bin/bash
# Start Quantum Arcade (backend + frontend)
# Requires: Node 20.11+ (Vite 5), Python 3.11+, ANTHROPIC_API_KEY in .env
set -e

ROOT=$(cd "$(dirname "$0")" && pwd)

# Free ports if already in use
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo "⚛ Starting Quantum Arcade..."

# Backend
echo "→ Starting backend on http://localhost:8000"
source "$ROOT/venv/bin/activate"
cd "$ROOT"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Frontend
echo "→ Starting frontend on http://localhost:5173"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✓ Backend:  http://localhost:8000/docs"
echo "✓ Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
