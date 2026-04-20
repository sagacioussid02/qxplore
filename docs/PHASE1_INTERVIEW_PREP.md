# Phase 1 — Quantum Computing Interview Prep

## Goal

A LeetCode-style challenge platform for quantum computing. Candidates practice implementing circuits, optimizing gate usage, and explaining quantum concepts — the exact skills IBM Quantum, Google Quantum AI, IonQ, and AWS Braket teams test.

## Target User

- CS/physics graduates applying to quantum computing roles
- Software engineers transitioning into quantum
- Researchers wanting to sharpen implementation skills

## Revenue

- Free tier: 3 challenges/month, no leaderboard
- Prep subscription: $39/month or $199/lifetime — unlimited challenges, leaderboard, hints, AI explanation

---

## Challenge Categories & Seed Content

Start with 15 challenges across 4 categories. More added over time.

### Category 1: Gate Fundamentals (Beginner)
| # | Title | Goal | Classical equivalent |
|---|---|---|---|
| 1 | Bit Flip | Apply X gate, measure \|1⟩ | NOT gate |
| 2 | Superposition | Apply H gate, explain output distribution | Random bit |
| 3 | Phase Kickback | Apply Z gate, observe phase | Sign flip |
| 4 | Build a Bell State | H + CNOT on 2 qubits, verify entanglement | None |
| 5 | GHZ State | 3-qubit entanglement: H + 2×CNOT | None |

### Category 2: Circuit Construction (Intermediate)
| # | Title | Goal | Classical equivalent |
|---|---|---|---|
| 6 | Quantum Teleportation | 3-qubit teleportation circuit | Network packet copy |
| 7 | Deutsch Algorithm | 1-qubit oracle, identify constant vs balanced | 2 classical queries |
| 8 | Bernstein-Vazirani | Find hidden bitstring in one query | n classical queries |
| 9 | Quantum Fourier Transform | Implement QFT on 3 qubits | FFT |
| 10 | Swap Test | Measure similarity between two states | Vector dot product |

### Category 3: Algorithm Implementation (Advanced)
| # | Title | Goal | Classical equivalent |
|---|---|---|---|
| 11 | Grover's Search (n=4) | Find marked item in 4-element list | Linear scan |
| 12 | Phase Estimation | Estimate eigenphase of unitary | Matrix eigenvalue |
| 13 | Amplitude Amplification | Generalize Grover to arbitrary oracle | — |
| 14 | Variational Circuit | Build a 2-layer ansatz for VQE-style optimization | Gradient descent |
| 15 | Shor's Period Finding | Implement modular exponentiation circuit | Trial division |

### Category 4: Optimization (Expert — leaderboard-ranked)
| # | Title | Goal |
|---|---|---|
| OPT-1 | Minimize Depth | Achieve Bell state in ≤ 2 gates |
| OPT-2 | Gate Count Race | Grover's in minimum CNOT count |
| OPT-3 | T-gate Minimization | QFT with fewest T gates (fault-tolerance proxy) |

---

## Scoring System

Every submission is scored on three axes:

```
Total Score = Correctness (60%) + Efficiency (30%) + Speed (10%)

Correctness:  statevector matches expected output within tolerance ε=0.01
Efficiency:   score = max(0, 100 - (submitted_gates - optimal_gates) * 5)
Speed:        score = max(0, 100 - seconds_taken)
```

Leaderboard ranks by total score, tiebroken by submission time.

---

## Backend Architecture

### New Files to Create

```
backend/
  models/
    challenge_models.py       — Challenge, Submission, LeaderboardEntry models
  routers/
    challenges.py             — CRUD + submission + leaderboard endpoints
  quantum/
    challenge_runner.py       — Run submitted circuit, compare to expected statevector
  data/
    challenges/
      01_bit_flip.json        — Seed challenge definitions
      02_superposition.json
      ... (15 total)
```

### Supabase Tables (add to supabase_schema.sql)

```sql
-- Challenge definitions (admin-managed)
create table challenges (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,           -- e.g. 'bell-state'
  title       text not null,
  category    text not null,                  -- 'fundamentals' | 'construction' | 'algorithm' | 'optimization'
  difficulty  text not null,                  -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
  description text not null,
  hints       jsonb default '[]',             -- array of hint strings (shown for subscribers)
  constraints jsonb not null,                 -- {max_qubits, max_gates, time_limit_seconds}
  expected_sv jsonb not null,                 -- expected statevector (or null for optimization)
  optimal_gates int,                          -- for efficiency scoring
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- User submissions
create table submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  challenge_id  uuid references challenges not null,
  gates         jsonb not null,               -- circuit gate list (same format as Circuit Composer)
  score         int not null,
  correctness   int not null,
  efficiency    int not null,
  speed_score   int not null,
  time_taken_s  int not null,
  passed        boolean not null,
  circuit_qasm  text,
  submitted_at  timestamptz default now()
);

-- Materialized leaderboard (best score per user per challenge)
create table leaderboard (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  challenge_id  uuid references challenges not null,
  best_score    int not null,
  best_gates    int not null,
  display_name  text,
  updated_at    timestamptz default now(),
  unique(user_id, challenge_id)
);
```

### New API Endpoints

```
GET  /prep/challenges                  — list all active challenges (paginated, filterable by category/difficulty)
GET  /prep/challenges/{slug}           — get single challenge detail (hints gated behind subscription check)
POST /prep/challenges/{slug}/submit    — submit gate list, get scored result (requires auth)
GET  /prep/leaderboard/{slug}          — top 20 for a challenge
GET  /prep/leaderboard/global          — global top 50 by total score across all challenges
GET  /prep/my-submissions              — current user's submission history (requires auth)
```

### challenge_runner.py

Core logic: take submitted `gates` (same JSON format Circuit Composer already uses), build a Qiskit circuit, run it, compare statevector to expected.

```python
def run_and_score(
    gates: list[dict],
    expected_sv: list[complex],
    optimal_gates: int,
    time_taken_s: int,
    max_qubits: int = 4,
) -> ScoringResult:
    # 1. Build circuit from gates (reuse circuit_builder.py logic)
    # 2. Run on AerSimulator (save_statevector before measure)
    # 3. Compare statevectors: fidelity = |⟨ψ_expected|ψ_submitted⟩|²
    # 4. correctness = 100 if fidelity > 0.99 else 0
    # 5. efficiency = max(0, 100 - (len(gates) - optimal_gates) * 5)
    # 6. speed = max(0, 100 - time_taken_s)
    # 7. Return ScoringResult with breakdown
```

**Key**: reuse `backend/quantum/circuit_builder.py` — don't rewrite circuit execution. The challenge runner is just a scoring wrapper around it.

---

## Frontend Architecture

### New Files to Create

```
frontend/src/
  pages/
    PrepPage.tsx              — challenge browser + category filter
    ChallengePage.tsx         — single challenge: description + embedded composer + timer + submit
    LeaderboardPage.tsx       — global + per-challenge leaderboard
  hooks/
    useChallenge.ts           — fetch challenge, track timer, submit, receive score
  api/
    prepApi.ts                — axios wrappers for /prep/* endpoints
  types/
    challenge.ts              — TypeScript interfaces
  components/
    prep/
      ChallengeCard.tsx       — card in the browser grid
      ScoreBreakdown.tsx      — correctness / efficiency / speed bars
      TimerBadge.tsx          — countdown timer during challenge
      HintPanel.tsx           — collapsible hints (subscription-gated)
      LeaderboardTable.tsx    — ranked table with score columns
```

### Key Pages

**`/prep`** — Challenge browser
- Grid of challenge cards filterable by category and difficulty
- Each card shows: title, difficulty badge, your best score (if any), top score on leaderboard
- Free users see all challenges but submit button shows paywall after 3

**`/prep/:slug`** — Single challenge
- Left panel: problem statement, constraints, hints (locked for free)
- Right panel: embedded Circuit Composer (reused as-is, no changes to it)
- Bottom: timer countdown, "Submit" button
- After submit: animated score breakdown (correctness / efficiency / speed)
- "View top solutions" link → leaderboard for this challenge

**`/prep/leaderboard`** — Global leaderboard
- Sortable by total score, gate efficiency, number of challenges solved
- User's own row highlighted
- Links to individual challenge leaderboards

### Reusing Existing Components

- **Circuit Composer** (`CircuitComposerPage.tsx`) — embed the composer logic directly in ChallengePage. The gate JSON format is already defined; just pass it to the new `/prep/challenges/{slug}/submit` endpoint instead of `/quantum/circuit`.
- **Auth** (`useAuth.ts`) — subscription check reuses the same session/credits pattern.
- **AppShell** — no changes needed, just add `/prep` and `/prep/:slug` routes.

---

## Subscription Gate

Free tier:
- Browse all challenges
- Submit up to 3 per month
- No hints
- No leaderboard

Prep subscription ($39/mo via Stripe):
- Unlimited submissions
- All hints unlocked
- Full leaderboard access + your rank
- AI explanation of wrong answers (Claude agent — "why did my circuit fail?")

The Stripe product/price ID goes in `.env` as `STRIPE_PREP_PRICE_ID`. The webhook already exists; just add a new fulfillment branch for the prep product.

---

## AI Integration

Add a new Claude agent: **PrepCoach**

- Triggered after a failed submission
- Receives: challenge description, submitted gates, expected vs actual statevector, score breakdown
- Returns: explanation of what went wrong + one targeted hint
- Streamed via SSE like existing agents
- Only available to subscribers

```
backend/agents/prep_coach.py    — new agent, same BaseAgent pattern
GET /agents/prep-coach/stream?challenge_slug=&submission_id=
```

---

## Implementation Order

1. Supabase schema migration (challenges, submissions, leaderboard tables)
2. `challenge_models.py` + seed 5 challenge JSON files
3. `challenge_runner.py` (scoring engine)
4. `challenges.py` router (list, get, submit, leaderboard endpoints)
5. `prepApi.ts` + `challenge.ts` types
6. `useChallenge.ts` hook
7. `PrepPage.tsx` (browser)
8. `ChallengePage.tsx` (core experience — biggest piece)
9. `LeaderboardPage.tsx`
10. Subscription paywall integration
11. `PrepCoach` agent (last — needs the rest working first)

---

## What Does NOT Change

- `/circuit` Circuit Composer — untouched, reused by reference
- All game pages (coin, roulette, ttt, circuit-ttt, rsa)
- Existing agents (tutor, game-master, opponent, concept-qa)
- Auth, credits, Stripe webhook
- All existing backend routers and quantum modules
