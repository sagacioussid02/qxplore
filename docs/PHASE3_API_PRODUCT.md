# Phase 3 — Quantum API Product

## Goal

Expose Quantum Expedition's real Qiskit circuits as a developer API. Any team building an app that needs quantum randomness, circuit execution, or a factoring demo can call our endpoints instead of standing up their own Qiskit backend.

This is the lowest-friction monetization tier: no UI to build, no sales call needed. A developer signs up, generates an API key, pastes one curl command, and is billing within minutes.

## Target User

- Mobile / web developers who want cryptographically verifiable random numbers
- Security researchers building post-quantum demos
- Students and educators embedding live quantum results in their own projects
- Enterprise dev teams evaluating quantum before committing to IBM Quantum or AWS Braket
- Hackathon participants who need a quantum backend they can call in 60 seconds

## Revenue

| Tier | Price | Calls/month | SLA |
|------|-------|-------------|-----|
| Free | $0 | 100 | Best effort |
| Growth | $49/mo | 10,000 | 99.5% uptime |
| Enterprise | Custom | Unlimited | 99.9% + dedicated support |

Overage: $0.01 per call above limit (Growth only — Free blocks at limit).

---

## What the API Exposes

Four endpoints, each wrapping an existing Qiskit circuit. No new quantum logic is written — this is a clean API layer over code that already works and is battle-tested.

### `POST /api/v1/random`
**Wraps**: `roulette.py` — n-qubit Hadamard, measured once

```json
// Request
{ "bits": 8 }

// Response
{
  "value": 173,
  "bits": 8,
  "binary": "10101101",
  "circuit_shots": 1,
  "entropy_source": "AerSimulator (noiseless)",
  "calls_used": 12,
  "calls_remaining": 88
}
```

Use case: true random numbers for token generation, nonces, game seeds. Cheaper and more defensible than a PRNG for security-sensitive contexts.

---

### `POST /api/v1/coin`
**Wraps**: `coin.py` — single H gate on |0⟩, one measurement

```json
// Request
{ "shots": 1 }

// Response
{
  "outcome": 1,
  "statevector": [{ "real": 0.707, "imag": 0.0 }, { "real": 0.707, "imag": 0.0 }],
  "bloch": { "x": 0.0, "y": 0.0, "z": 0.0 },
  "calls_used": 13,
  "calls_remaining": 87
}
```

Use case: provably fair coin flip for games, lotteries, DAO governance votes.

---

### `POST /api/v1/circuit`
**Wraps**: `circuit_builder.py` — arbitrary gate list, up to 4 qubits / 8 steps

```json
// Request
{
  "num_qubits": 2,
  "gates": [
    { "type": "H", "qubit": 0, "step": 0 },
    { "type": "CNOT", "qubit": 0, "step": 1, "target": 1 }
  ]
}

// Response
{
  "statevector": [...],
  "probabilities": { "00": 0.5, "11": 0.5 },
  "bloch_vectors": [...],
  "circuit_depth": 2,
  "num_gates": 2,
  "calls_used": 14,
  "calls_remaining": 86
}
```

Use case: run custom circuits for research, education, or demos without managing a local Qiskit install. The most flexible endpoint — developers can implement Grover's, QFT, or anything within the gate/qubit limit.

---

### `POST /api/v1/factor`
**Wraps**: `shor.py` — fixed n=15, a=7 QPE circuit

```json
// Request
{}   // no parameters — demo is fixed to n=15

// Response
{
  "n": 15,
  "factors": [3, 5],
  "period": 4,
  "steps": [...],
  "circuit_shots": 2048,
  "calls_used": 15,
  "calls_remaining": 85
}
```

Use case: investor / enterprise demos showing Shor's algorithm running on a real quantum circuit. The `steps` array contains a narrative walkthrough, useful for explainer UIs.

---

## Authentication

Every request to `/api/v1/*` must include an API key in the `Authorization` header:

```bash
curl -X POST https://api.quantumexpedition.com/api/v1/random \
  -H "Authorization: Bearer qx_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"bits": 8}'
```

Keys are prefixed `qx_live_` for production. Keys are shown **once** at creation and cannot be retrieved again (only the hash is stored). Lost keys must be revoked and regenerated.

---

## Backend Architecture

### New Files to Create

```
backend/
  services/
    api_key_service.py     — generate, validate, hash, record usage
  routers/
    api_keys.py            — key CRUD endpoints (requires JWT auth)
    public_api.py          — /api/v1/* endpoints (requires API key auth, not JWT)
  middleware/
    api_key_middleware.py  — FastAPI dependency: validate key, check limit, record call
```

### Supabase Table

```sql
create table api_keys (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  key_prefix     text not null,          -- first 8 chars, shown in UI (e.g. "qx_live_")
  key_hash       text not null unique,   -- sha256(full_key), never stored plain
  tier           text not null default 'free',
  calls_used     int not null default 0,
  calls_limit    int not null default 100,
  last_used_at   timestamptz,
  created_at     timestamptz default now()
);
```

### api_key_service.py

```python
def generate_key(user_id: str, tier: str) -> tuple[str, str]:
    """Returns (plain_key, key_prefix). Store only the hash."""

def validate_key(raw_key: str) -> APIKeyRecord | None:
    """Hash the key, look up in DB. Returns record or None."""

def record_call(key_id: str) -> None:
    """Increment calls_used, update last_used_at atomically."""

def get_usage(user_id: str) -> list[APIKeyRecord]:
    """Return all keys for a user with current usage."""
```

### Key generation format
```
qx_live_<32 random base62 chars>
```
Total length: 43 chars. Prefix `qx_live_` makes it unambiguous and grep-able in logs.

### Rate limiting
Enforced in the FastAPI dependency before the endpoint handler runs:
```python
async def api_key_auth(authorization: str = Header(...)) -> APIKeyRecord:
    key = validate_key(authorization.removeprefix("Bearer "))
    if not key:
        raise HTTPException(401, "Invalid API key")
    if key.calls_used >= key.calls_limit:
        raise HTTPException(429, "Monthly call limit reached. Upgrade at quantumexpedition.com/account")
    await record_call(key.id)
    return key
```

### Key Management Endpoints (JWT-authenticated — for the UI)
```
POST   /api-keys          — create a new key (returns plain key once)
GET    /api-keys          — list user's keys (prefix, tier, usage, last_used)
DELETE /api-keys/{id}     — revoke a key
GET    /api-keys/usage    — usage summary across all keys
```

---

## Frontend Architecture

### New Files to Create

```
frontend/src/
  pages/
    ApiDocsPage.tsx        — interactive API documentation + pricing table
  components/
    api/
      ApiKeyManager.tsx    — create / list / revoke keys (used in dashboard)
      UsageMeter.tsx       — calls used / limit progress bar
      EndpointDoc.tsx      — single endpoint: description + request + response + curl + try-it
      PricingTable.tsx     — Free / Growth / Enterprise tier cards
```

### Key Pages

**`/api-docs`** — Main docs page
- Pricing table at top: Free / Growth / Enterprise side by side
- 4 endpoint sections, each with:
  - Description and use case
  - Request schema (JSON with field descriptions)
  - Response schema
  - Copy-able `curl` example with the user's real key auto-injected (if logged in)
  - "Try it" panel: editable JSON input, "Send" button, live response display
- "Get your API key" CTA → `/account` or inline key creation

**`/dashboard` (api section)** — embedded `ApiKeyManager`
- Table: key prefix | tier | calls used | calls limit | last used | revoke
- "Create new key" button
- `UsageMeter` per key

### "Try it" Interaction
```
User edits JSON request body
  → clicks Send
  → frontend calls our backend proxy at GET /api-docs/try-it
  → backend calls /api/v1/* with the user's real key
  → response shown in a code block with syntax highlighting
```
The proxy approach keeps the API key out of the browser network tab.

---

## Security Considerations

- **Keys hashed at rest**: SHA-256 of the full key stored; plain text never touches the database
- **Key shown once**: On creation, the plain key is returned in the response body. We display it with a "copy" button and a warning that it cannot be shown again. After the modal closes, it's gone
- **Prefix for identification**: The first 8 chars (`qx_live_`) are stored in plaintext for display in the UI — users can tell which key is which without revealing the secret
- **No key in logs**: Middleware strips the Authorization header before logging
- **Rate limit before execution**: Usage is checked and incremented atomically before the Qiskit circuit runs — prevents overages from concurrent requests
- **Separate auth from games**: `/api/v1/*` uses API key auth, never JWT. The two auth systems never overlap

---

## Pricing Page Copy

```
Free    — $0/month
100 calls/month · All 4 endpoints · Best-effort uptime
No credit card required. Start in 60 seconds.

Growth  — $49/month
10,000 calls/month · All endpoints · 99.5% uptime SLA
Overage: $0.01/call · Priority support

Enterprise — Contact us
Unlimited calls · 99.9% SLA · Dedicated instance option
Custom contract · Invoice billing · Slack support channel
```

---

## Developer Experience Goals

1. **Zero to first call in under 2 minutes**: sign up → generate key → copy curl → run
2. **Transparent usage**: every response includes `calls_used` and `calls_remaining`
3. **Sensible errors**: `429` includes a human-readable message with the upgrade URL
4. **Versioned**: all endpoints under `/api/v1/` — future breaking changes go to `/api/v2/` without breaking existing integrations
5. **Language agnostic**: plain JSON over HTTPS, works from curl, Python requests, JS fetch, or any HTTP client

---

## Implementation Order

1. Supabase `api_keys` table migration
2. `api_key_service.py` — generate, hash, validate, record (pure logic, no FastAPI)
3. `api_keys.py` router — key CRUD (JWT-authenticated)
4. `api_key_middleware.py` — FastAPI dependency for API key auth
5. `public_api.py` — `/api/v1/*` endpoints wrapping existing circuits
6. `ApiKeyManager.tsx` + wire into `/dashboard`
7. `ApiDocsPage.tsx` (`/api-docs`) with endpoint docs + pricing
8. "Try it" proxy endpoint + interactive docs panel

---

## What Does NOT Change

- All existing game routes and pages
- All existing agents (tutor, game master, opponent, concept-qa)
- All existing quantum circuits — `coin.py`, `roulette.py`, `circuit_builder.py`, `shor.py` are reused untouched
- Auth, credits, Stripe webhook — the billing flow for API tier upgrades reuses the existing Stripe webhook
- Phase 1 (Prep) and Phase 2 (Benchmark) — fully independent, can ship in any order

---

## Dependencies to Add

None. No new Python packages required — `hashlib` (stdlib) handles SHA-256; existing FastAPI, httpx, and Supabase client cover everything else.
