# Implementation Plan — Feature Breakdown

Each feature below is self-contained and implementable in a single session.
Features within a phase are listed in dependency order — never start a feature
before its dependencies are marked ✅.

Status legend: 🔲 Not started · 🔨 In progress · ✅ Done

---

## Foundation (build first — shared by all phases)

These have no dependencies on each other and can be done in any order,
but MUST be done before any Phase 1 or Phase 2 feature.

---

### F-01 · Supabase Schema Migration 🔲
**What**: Add all new tables to `supabase_schema.sql` and run them.
**Creates**:
- `challenges(id, slug, title, category, difficulty, description, hints, constraints, expected_sv, optimal_gates, is_active)`
- `submissions(id, user_id, challenge_id, gates, score, correctness, efficiency, speed_score, time_taken_s, passed, circuit_qasm)`
- `leaderboard(id, user_id, challenge_id, best_score, best_gates, display_name)` with `unique(user_id, challenge_id)`
- `benchmark_runs(id, user_id, template, parameters, quantum_result, classical_result, speedup_factor, pdf_url)`
**Touches**: `supabase_schema.sql` only
**Done when**: Tables exist in Supabase, RLS policies allow authenticated read/write

---

### F-02 · Subscription Tier Column 🔲
**What**: Add a `tier` column to the existing `credits` table.
**Values**: `'free' | 'prep' | 'pro' | 'team'` — default `'free'`
**Touches**: `supabase_schema.sql`, `backend/core/supabase_auth.py` (add `get_tier()` helper)
**Done when**: `get_tier(user_id)` returns the correct string; Stripe webhook updated to set tier on payment

---

### F-03 · User Dashboard Page 🔲
**What**: `/dashboard` — a central hub showing everything about the user in one place.
**Sections** (initially mostly empty placeholders, filled in as phases ship):
- Credits remaining + tier badge
- Interview Prep: challenges solved, best rank, recent submissions (placeholder until Phase 1)
- Benchmarking: runs this month, last run summary (placeholder until Phase 2)
- API: keys + usage (placeholder until Phase 3)
**Touches**: `frontend/src/pages/DashboardPage.tsx` (new), `App.tsx` (add route), `Home.tsx` (add nav link)
**Does NOT touch**: any existing game pages
**Done when**: `/dashboard` renders with real credit/tier data from `useAuth`

---

## Phase 1 — Interview Prep

Dependencies: F-01, F-02 must be ✅ before starting.

---

### P1-01 · Challenge Data Models + Seed Challenges 🔲
**Depends on**: F-01
**What**: Backend Pydantic models and 5 seed challenge JSON files.
**Creates**:
- `backend/models/challenge_models.py` — `Challenge`, `SubmitRequest`, `ScoringResult`, `LeaderboardEntry`
- `backend/data/challenges/01_bit_flip.json`
- `backend/data/challenges/02_superposition.json`
- `backend/data/challenges/03_bell_state.json`
- `backend/data/challenges/04_ghz_state.json`
- `backend/data/challenges/05_phase_kickback.json`

Each JSON has: `slug, title, category, difficulty, description, hints[], constraints{}, expected_sv[], optimal_gates`

**Done when**: JSON files load cleanly into the Pydantic model, expected statevectors are verified correct by running the optimal circuit manually

---

### P1-02 · Challenge Runner (Scoring Engine) 🔲
**Depends on**: P1-01
**What**: `backend/quantum/challenge_runner.py` — the core scoring logic.
**Logic**:
1. Accept gate list (same JSON format as Circuit Composer)
2. Build Qiskit circuit by calling existing `circuit_builder.py`
3. Run on AerSimulator, extract statevector
4. Compute fidelity `|⟨ψ_expected|ψ_submitted⟩|²`
5. `correctness = 100 if fidelity > 0.99 else int(fidelity * 100)`
6. `efficiency = max(0, 100 - (submitted_gates - optimal_gates) * 5)`
7. `speed = max(0, 100 - time_taken_s)`
8. `total = 0.6*correctness + 0.3*efficiency + 0.1*speed`
**Does NOT create new Qiskit code** — delegates to `circuit_builder.py`
**Done when**: Unit test passes for bit-flip challenge (submit X gate → score 100), wrong circuit → score 0

---

### P1-03 · Challenges API Router 🔲
**Depends on**: P1-01, P1-02, F-01
**What**: `backend/routers/challenges.py` + register in `main.py`
**Endpoints**:
- `GET /prep/challenges` — list active challenges (no auth required)
- `GET /prep/challenges/{slug}` — get challenge detail; hints gated by tier
- `POST /prep/challenges/{slug}/submit` — score submission (auth required; free tier: max 3/month enforced)
- `GET /prep/leaderboard/{slug}` — top 20 for a challenge
- `GET /prep/leaderboard/global` — top 50 across all challenges
- `GET /prep/my-submissions` — current user history (auth required)
**Done when**: All endpoints return correct responses; free-tier limit enforced; submission writes to Supabase and upserts leaderboard

---

### P1-04 · Frontend Types + API Client 🔲
**Depends on**: P1-03
**What**:
- `frontend/src/types/challenge.ts` — `Challenge`, `ScoringResult`, `LeaderboardEntry`, `Submission`
- `frontend/src/api/prepApi.ts` — axios wrappers for all `/prep/*` endpoints
**Done when**: TypeScript compiles clean, all API calls typed

---

### P1-05 · Challenge Browser Page (`/prep`) 🔲
**Depends on**: P1-04
**What**: `frontend/src/pages/PrepPage.tsx` + `ChallengeCard.tsx`
**UI**:
- Page header: "Quantum Interview Prep" with category filter tabs (All / Fundamentals / Construction / Algorithm / Optimization)
- Grid of `ChallengeCard` components showing: title, difficulty badge (color-coded), category, user's best score (if any)
- Free-tier banner: "X of 3 free submissions used this month"
- Locked card state for premium challenges if not subscribed
**Does NOT build**: the challenge solving experience (that's P1-06)
**Done when**: Page renders real challenges from API, filter tabs work, cards link to `/prep/:slug`

---

### P1-06 · Challenge Solve Page (`/prep/:slug`) 🔲
**Depends on**: P1-05, P1-02
**What**: `frontend/src/pages/ChallengePage.tsx` + `useChallenge.ts` hook + `TimerBadge.tsx` + `ScoreBreakdown.tsx`
**Layout** (split panel):
- Left: problem statement, constraints box, hints panel (locked for free users)
- Right: embedded Circuit Composer — reuse the gate-building logic from `CircuitComposerPage.tsx`; submit gates to `/prep/challenges/{slug}/submit` instead of `/quantum/circuit`
- Bottom bar: countdown timer (starts on page load), "Submit" button
- After submit: animated `ScoreBreakdown` (three progress bars: correctness / efficiency / speed)
**This is the biggest single feature — the core product experience**
**Done when**: User can build a circuit, submit it, receive a score with breakdown, timer works, gate list is correctly serialized and sent to backend

---

### P1-07 · Leaderboard Page (`/prep/leaderboard`) 🔲
**Depends on**: P1-03, P1-04
**What**: `frontend/src/pages/LeaderboardPage.tsx` + `LeaderboardTable.tsx`
**UI**:
- Tab toggle: Global / Per-Challenge (dropdown to pick challenge)
- Table: rank, display name, score, gates used, challenges solved, date
- Current user's row highlighted in cyan
- Free users see top 5 only; "Unlock full leaderboard" paywall prompt
**Done when**: Global and per-challenge leaderboards render real data; user row highlighted

---

### P1-08 · Prep Subscription Paywall 🔲
**Depends on**: F-02, P1-06, P1-07
**What**: Stripe product for prep tier + paywall enforcement
**Changes**:
- Add `STRIPE_PREP_PRICE_ID` to `.env`
- Add prep tier fulfillment branch in `backend/routers/stripe_router.py` webhook handler
- `backend/core/supabase_auth.py`: `get_tier()` now returns `'prep'` for prep subscribers
- Frontend: `HintPanel.tsx` — renders hints if tier ≥ prep, else "Subscribe to unlock" CTA
- Free submission counter enforced in submit endpoint
**Done when**: Stripe checkout sets tier to `'prep'`; hints unlock; submission limit enforced

---

### P1-09 · PrepCoach AI Agent 🔲
**Depends on**: P1-08 (subscribers only), P1-06
**What**: `backend/agents/prep_coach.py` + SSE endpoint
**Behaviour**: After a failed submission, "Explain my mistake" button streams Claude's explanation of why the circuit didn't produce the expected statevector
**System prompt context**: challenge description + submitted gates + expected vs actual statevector + score breakdown
**Endpoint**: `GET /agents/prep-coach/stream?challenge_slug=&submission_id=`
**Done when**: Explanation streams correctly for a wrong Bell state submission; 401 returned for free users

---

### P1-10 · Add 10 More Challenges (Content) 🔲
**Depends on**: P1-01 (pattern established)
**What**: 10 more seed JSON files covering Construction and Algorithm categories
- `06_teleportation.json` through `15_shor_period.json`
**Done when**: All 15 challenges appear in the browser with correct expected statevectors

---

### P1-11 · Wire Prep into Dashboard 🔲
**Depends on**: F-03, P1-07
**What**: Fill in the "Interview Prep" section of `/dashboard`
- Challenges solved count, best global rank, recent submissions list (last 5)
**Done when**: Dashboard shows real prep stats for logged-in user

---

## Phase 2 — Benchmarking Tool

Dependencies: F-01, F-02 must be ✅. Phase 1 does NOT need to be complete first.

---

### P2-01 · Classical Solvers Module 🔲
**Depends on**: nothing (pure Python, no Supabase, no Qiskit)
**What**: `backend/classical/classical_solvers.py`
**Implements** (each returns `ClassicalResult(steps, time_ms, result, complexity_label)`):
- `linear_search(n, target)` — step-counted linear scan
- `pollards_rho(n)` — Pollard's rho factoring
- `numpy_fft(data)` — FFT with FLOP count estimate
- `brute_force_maxcut(adjacency)` — enumerate all 2^N cuts
- `prng_bits(n_bits)` — compare to quantum RNG
**Done when**: Each function returns correct result + step count for small inputs; unit tested

---

### P2-02 · Quantum Circuit Builders for Templates 🔲
**Depends on**: nothing new (uses existing AerSimulator)
**What**: New quantum circuits that don't exist yet
- `backend/quantum/grover_circuit.py` — auto-generates Grover's circuit for arbitrary N (up to 2^8)
- `backend/quantum/qft_benchmark.py` — QFT on 2–4 qubits, returns metrics
- `backend/quantum/qaoa_circuit.py` — 1-layer QAOA for Max-Cut on 3–5 nodes
**Note**: RNG template reuses `roulette.py`; Shor template reuses `shor.py`; Free-form reuses `circuit_builder.py`
**Done when**: Each circuit runs on AerSimulator and returns statevector + gate metrics

---

### P2-03 · Benchmark Models + Runner 🔲
**Depends on**: P2-01, P2-02
**What**:
- `backend/models/benchmark_models.py` — `BenchmarkRunRequest`, `QuantumMetrics`, `ClassicalMetrics`, `BenchmarkResult`
- `backend/quantum/benchmark_runner.py` — routes `template` string to correct quantum + classical functions, times both, computes speedup
**Done when**: `run_benchmark('grover', {n: 16, target: 7})` returns full `BenchmarkResult` with both panels populated

---

### P2-04 · Benchmark API Router 🔲
**Depends on**: P2-03, F-01
**What**: `backend/routers/benchmark.py` + register in `main.py`
**Endpoints**:
- `GET /benchmark/templates` — list 6 templates with metadata (no auth)
- `POST /benchmark/run` — run benchmark, save to Supabase (free: 3/month limit)
- `GET /benchmark/runs` — user's run history (auth required)
- `GET /benchmark/runs/{id}` — single run detail
- `DELETE /benchmark/runs/{id}` — delete run
**Done when**: All endpoints work; run saved to Supabase; free limit enforced

---

### P2-05 · Frontend Types + API Client 🔲
**Depends on**: P2-04
**What**:
- `frontend/src/types/benchmark.ts`
- `frontend/src/api/benchmarkApi.ts`
**Done when**: TypeScript compiles clean

---

### P2-06 · Benchmark Template Selector Page (`/benchmark`) 🔲
**Depends on**: P2-05
**What**: `frontend/src/pages/BenchmarkPage.tsx` + `TemplateCard.tsx` + `RunHistoryList.tsx`
**UI**:
- 6 template cards: icon, name, tagline ("Grover's vs Linear Scan"), complexity hint
- Each card has parameter inputs (N for Grover, bit-width for RNG, etc.)
- "Run Benchmark" button — triggers run, navigates to results page
- Below: last 10 runs as a compact list with quick stats
- Free-tier counter: "2 of 3 free runs remaining"
**Done when**: User can pick Grover template, set N=16, click run, see navigation to results

---

### P2-07 · Benchmark Results Page (`/benchmark/run/:id`) 🔲
**Depends on**: P2-06
**What**: `frontend/src/pages/BenchmarkRunPage.tsx` + `MetricsTable.tsx` + `SpeedupChart.tsx` + `ComplexityBadge.tsx` + `CircuitStats.tsx`
**UI**:
- Two-panel layout: Quantum (left) vs Classical (right)
- `CircuitStats`: depth / gate count / CNOT count / qubits / sim time
- `MetricsTable`: side-by-side comparison table
- `SpeedupChart`: bar chart showing quantum vs classical step counts
- `ComplexityBadge`: large O(√N) vs O(N) label
- Scaling table: shows speedup at N=16, 256, 65536
**Done when**: Results page renders correctly for a Grover run; chart animates in; all metrics shown

---

### P2-08 · PDF Export 🔲
**Depends on**: P2-04 (backend), P2-07 (frontend button)
**What**:
- Add `reportlab` to `requirements.txt`
- `backend/services/pdf_generator.py` — 5-page PDF structure (cover, circuit, classical, speedup, interpretation)
- `POST /benchmark/runs/{id}/export-pdf` endpoint — generates PDF, uploads to Supabase Storage, returns signed URL
- `frontend/src/components/benchmark/ExportButton.tsx` — "Export PDF" button; Pro gate (greyed + upgrade prompt for free)
**Done when**: Pro user clicks export, PDF downloads with correct content; free user sees upgrade prompt

---

### P2-09 · BenchmarkAnalyst AI Agent 🔲
**Depends on**: P2-04, P2-08
**What**: `backend/agents/benchmark_analyst.py` + SSE endpoint
**Behaviour**: After run completes, streams plain-English interpretation of speedup, when quantum wins at scale, caveats about noise
**Endpoint**: `GET /agents/benchmark-analyst/stream?run_id=`
**Available to**: Pro and Team tiers only
**Done when**: Agent streams meaningful analysis for a Grover run; free users get 401

---

### P2-10 · Wire Benchmark into Dashboard 🔲
**Depends on**: F-03, P2-04
**What**: Fill in the "Benchmarking" section of `/dashboard`
- Runs this month, last run template + speedup factor, quick link to run history
**Done when**: Dashboard shows real benchmark stats

---

## Phase 3 — API Product

Dependencies: F-01, F-02. Can start independently of Phase 1 and 2.

---

### P3-01 · API Key Management (Backend) 🔲
**Depends on**: F-01
**What**:
- `api_keys` Supabase table: `(id, user_id, key_prefix, key_hash, tier, calls_used, calls_limit, created_at, last_used_at)`
- `backend/services/api_key_service.py` — `generate_key()`, `validate_key()`, `record_call()`, `get_usage()`
- `backend/routers/api_keys.py` — `POST /api-keys` (create), `GET /api-keys` (list), `DELETE /api-keys/{id}` (revoke)
- Rate-limit middleware: validate API key on requests to `/api/v1/*`, enforce calls_limit
**Done when**: Key generation returns `qx_live_...` prefixed key; validation middleware rejects invalid keys with 401; usage increments per call

---

### P3-02 · Public API Endpoints (`/api/v1/`) 🔲
**Depends on**: P3-01
**What**: New versioned router that wraps existing quantum modules, authenticated by API key (not JWT)
- `POST /api/v1/random` — quantum random number (wraps `roulette.py`)
- `POST /api/v1/circuit` — run arbitrary circuit (wraps `circuit_builder.py`)
- `POST /api/v1/coin` — quantum coin flip (wraps `coin.py`)
- `POST /api/v1/factor` — Shor's n=15 demo (wraps `shor.py`)
**Request auth**: `Authorization: Bearer qx_live_...` header
**Done when**: All 4 endpoints return correct results with a valid API key; 401 on missing/invalid key; usage recorded

---

### P3-03 · API Key Management UI 🔲
**Depends on**: P3-01
**What**: Section in `/dashboard` (or standalone `/api-keys` page)
- Create new key (shows key once on creation — never again)
- List existing keys with prefix, tier, calls used/limit, last used date
- Revoke button with confirmation
**Done when**: Full key lifecycle works in UI; key is shown only once on creation

---

### P3-04 · API Docs Page (`/api-docs`) 🔲
**Depends on**: P3-02
**What**: `frontend/src/pages/ApiDocsPage.tsx`
- Interactive docs (like a lightweight Swagger UI): each endpoint has description, request schema, response schema, example curl command
- "Try it" button: lets logged-in users call the endpoint with their key directly from the docs
- Pricing table: Free (100 calls/mo) / Growth ($49/mo, 10k) / Enterprise (contact)
**Done when**: All 4 endpoints documented with working "Try it" examples

---

## Build Order Summary

This is the recommended sequence — each row can start when its dependency is ✅:

```
Week 1  │ F-01  F-02  F-03  (foundation — all parallel)
Week 2  │ P1-01  P2-01  P2-02  P3-01  (data + backend primitives — all parallel)
Week 3  │ P1-02  P1-03  P2-03  P3-02  (core backend logic)
Week 4  │ P1-04  P1-05  P2-04  P2-05  (API clients + first frontend pages)
Week 5  │ P1-06  P2-06  P3-03  (core UX — biggest features)
Week 6  │ P1-07  P1-08  P2-07  P3-04  (leaderboard, paywall, results, docs)
Week 7  │ P1-09  P1-10  P2-08  P2-09  (AI agents, PDF, content)
Week 8  │ P1-11  P2-10  (dashboard wiring — tie everything together)
```

**Key principle**: Foundation first, then backend logic, then frontend. Never build a page before its API exists. Never build an API before its Supabase table exists.

---

## What to start with

**Recommended first session**: F-01 (Supabase schema) + P1-01 (challenge models + 5 seed challenges).

These two together give us the entire data layer for Phase 1 and take the least risk — pure data modeling, no Qiskit, no frontend. Once done, P1-02 (scoring engine) can start immediately and is the most technically interesting piece.
