# Quantum Expedition — Platform Roadmap

## Vision

A full-stack quantum computing platform targeting three audiences under one roof:

| Audience | Product | Revenue Model |
|---|---|---|
| Students / job seekers | Interview Prep | $39/mo subscription |
| Researchers / engineers | Benchmarking Tool | $99–499/mo SaaS |
| Developers | Quantum API | Usage-based, per-call |

The education games already built (Coin, Roulette, TTT, Circuit TTT, RSA/Shor) serve as the **top-of-funnel** — free, discoverable, drives brand. The three phases below are the monetization and professional layer on top.

---

## Architecture Principle: Preserve Everything Built

All existing routes, games, agents, and quantum circuits stay untouched. Each phase **adds** new routes, pages, and backend modules. No existing file is deleted or broken.

```
Existing (keep intact)
├── /coin          — Quantum Coin game
├── /roulette      — Quantum Roulette
├── /ttt           — Classic Quantum TTT (Goff variant)
├── /circuit-ttt   — Circuit TTT (PDF variant)
├── /circuit       — Circuit Composer
├── /rsa           — RSA vs Shor's demo
└── /account       — User account + credits

New (phases add on top)
├── /prep          — Phase 1: Interview Prep
├── /benchmark     — Phase 2: Benchmarking Tool
├── /api-docs      — Phase 3: API Product docs
└── /dashboard     — Unified user dashboard (ties all together)
```

---

## Phase Overview

### Phase 1 — Interview Prep
**Target**: candidates interviewing at IBM Quantum, Google, IonQ, AWS Braket teams  
**Revenue**: $39/mo or $199/lifetime subscription  
**Timeline estimate**: 3–4 weeks  
**Status**: Not started  
**Plan**: [PHASE1_INTERVIEW_PREP.md](./PHASE1_INTERVIEW_PREP.md)

### Phase 2 — Benchmarking Tool
**Target**: researchers, quantum-curious engineers, enterprise teams evaluating quantum ROI  
**Revenue**: Free (3 runs/mo) / Pro $99/mo / Team $499/mo  
**Timeline estimate**: 4–5 weeks  
**Status**: Not started  
**Plan**: [PHASE2_BENCHMARKING.md](./PHASE2_BENCHMARKING.md)

### Phase 3 — API Product
**Target**: developers building apps needing quantum randomness, circuit execution, or factoring  
**Revenue**: Free (100 calls/mo) / Growth $49/mo (10k calls) / Enterprise custom  
**Timeline estimate**: 2–3 weeks  
**Status**: Planned  
**Plan**: [PHASE3_API_PRODUCT.md](./PHASE3_API_PRODUCT.md)

---

## Shared Infrastructure Needed Across Phases

These are built once and used by all phases:

| Component | Used By | Notes |
|---|---|---|
| User dashboard `/dashboard` | All phases | Progress, scores, API keys, runs |
| API key table in Supabase | Phase 3 | `api_keys(id, user_id, key_hash, tier, calls_used, created_at)` |
| Challenge table in Supabase | Phase 1 | `challenges`, `submissions`, `leaderboard` |
| Benchmark run table | Phase 2 | `benchmark_runs(id, user_id, circuit, results, pdf_url)` |
| Subscription tier in credits table | All | Add `tier` column: free/prep/pro/enterprise |

---

## Investor Pitch Narrative

> "IBM, Google, and AWS have sold quantum cloud access to hundreds of enterprises. Those companies have no idea how to use it. Quantum Expedition is the training ground, testing ground, and integration layer — education for individuals, benchmarking for teams, and an API for developers."

**Why now**: Post-quantum cryptography NIST standards finalized 2024. Enterprise quantum spending accelerating. Zero good tooling for the gap between "bought quantum access" and "shipped quantum feature."

**Moat**: Real Qiskit circuit execution (not animations), Claude AI agents for explanation, structured progression from learner → practitioner → integrator.
