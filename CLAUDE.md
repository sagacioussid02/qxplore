# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Start everything
```bash
./start.sh          # kills ports 8000 & 5173, starts backend + frontend
```

### Backend only
```bash
source venv/bin/activate
python3 -m uvicorn backend.main:app --port 8000 --reload
```

### Frontend only
```bash
cd frontend && npm run dev
```

### Run TTT integration test (backend must be running)
```bash
source venv/bin/activate && python3 test_ttt.py
```

### Frontend type-check / lint
```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
```

### Install deps
```bash
source venv/bin/activate && pip install -r requirements.txt   # Python
cd frontend && npm install                                      # Node
```

**Node version constraint**: Vite 5 is pinned because Node 20.11.0 is in use (Vite 7 requires 20.19+). Do not upgrade vite or @vitejs/plugin-react without checking the Node version.

---

## Architecture

### Stack
| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Framer Motion + Zustand |
| 3D | @react-three/fiber (Bloch sphere) |
| Backend | Python 3.13 + FastAPI + Qiskit 1.x + qiskit-aer |
| AI agents | Anthropic SDK (`claude-opus-4-6`) |
| Auth | Supabase JWT |
| Payments | Stripe |

### Backend structure
```
backend/
  main.py              — FastAPI app, CORS, registers all routers
  core/config.py       — Settings (pydantic-settings, reads .env)
  core/supabase_auth.py — JWT validation + credit deduction
  models/
    quantum_state.py   — Pydantic models for Qiskit results
    game_state.py      — TTT, Coin, Roulette, Agent request/response models
  quantum/
    simulator.py       — Singleton AerSimulator, Bloch vector math, partial trace
    coin.py            — H-gate coin flip circuit
    roulette.py        — n-qubit Hadamard RNG
    ttt_collapse.py    — Cycle collapse circuit (n qubits, one H per move in cycle)
    circuit_builder.py — Generic circuit builder for Circuit Composer page
  agents/
    base.py            — BaseAgent: stream() and complete() via AsyncAnthropic
    tutor.py / game_master.py / concept_qa.py / opponent.py — Claude agents
  routers/
    quantum.py         — /quantum/* endpoints (coin, roulette, ttt-collapse, circuit)
    games.py           — /games/ttt/* — full TTT state machine
    agents.py          — /agents/* — SSE streaming + opponent JSON
    bracket.py         — NCAA bracket (separate feature)
    stripe_router.py   — Payment webhooks
```

### Frontend structure
```
frontend/src/
  App.tsx              — React Router routes
  pages/               — One file per page/route
  components/
    layout/AppShell.tsx — Nav, auth header, ConceptChat sidebar
    agents/            — GameMasterBanner, TutorPanel, ConceptChat
    quantum/           — BlochSphere (Three.js)
  hooks/               — useTicTacToe, useCoinGame, useSSEStream, useAuth, …
  api/                 — Thin axios wrappers per domain (gameApi, quantumApi, agentApi)
  store/               — Zustand stores: agentStore (AI streaming text), creditStore, bracketStore
  types/               — TypeScript interfaces mirroring backend Pydantic models
```

### Qiskit pattern (critical)
Always save statevector **before** `measure_all()`:
```python
qc.save_statevector(label="sv")   # must come before measurement
qc.measure_all()
tqc = transpile(qc, sim)
data = sim.run(tqc, shots=1).result().data(0)
sv = np.array(data["sv"])
```
Never use legacy `execute()` — Qiskit 1.x uses `sim.run(transpile(qc, sim))`.

### AI agent pattern
- **Streaming agents** (Tutor, GameMaster, ConceptQA): `BaseAgent.stream()` → `sse_generator()` → `EventSourceResponse` → frontend `EventSource`
- **JSON agent** (AIOpponent): `BaseAgent.complete()` → parse JSON with regex fallback → `OpponentResponse`
- SSE events format: `{"chunk": "...", "done": false}` / `{"chunk": "", "done": true}`
- Model for all agents: `claude-opus-4-6`

### TTT game state machine (`backend/routers/games.py`)
The `POST /games/ttt/{id}/move` endpoint is the core state machine:
1. Validate move (no classically-owned cells, no duplicate pair from same player)
2. Append `EntangledMove`, add `QuantumMarker` to both cells
3. Run DFS cycle detection (`_detect_cycle`) on full move list
4. If cycle → `_apply_collapse` (Qiskit circuit) → assign classical owners → clear markers → check win
5. If vs_ai and now AI's turn → call `AIOpponent.pick_move` → validate → apply → check cycle again
6. **Critical**: the AI validation `if` block must always switch `current_player` back to X in the `else` branch, even when AI returns valid JSON with invalid cells (silent failure path).

The DFS uses `visited`/`path` as closures and tracks parent by `move_id` (edge) not node, which correctly handles the "don't traverse the same edge back" invariant.

Cell indices are **0-indexed (0–8)** in all API calls. The frontend display adds +1 for human readability.

### Collapse conflict resolution (`_apply_collapse`)
When two moves in a cycle quantum-measure to the same cell, the second is redirected to its partner cell. After collapse, **all markers in all cycle cells** are marked `collapsed=True` regardless of which cells received classical owners.

### Vite/Zustand ESM fix
`use-sync-external-store` must be in `optimizeDeps.include` in `vite.config.ts`. Do **not** add `@react-three/fiber` to `optimizeDeps.exclude` — it breaks the CJS chain that Zustand depends on.

### Environment variables (`.env` in project root)
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```
