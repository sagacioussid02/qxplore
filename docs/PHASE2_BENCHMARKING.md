# Phase 2 — Quantum Algorithm Benchmarking Tool

## Goal

Let researchers and enterprise teams configure a quantum circuit, run it on AerSimulator, and see a side-by-side comparison against the best classical algorithm for the same problem. Export a professional PDF report. This is a decision-support tool: "should we invest in quantum for this use case?"

## Target User

- Quantum researchers comparing circuit implementations
- Enterprise software engineers evaluating quantum ROI for a specific problem
- Pre-sales engineers at IBM/AWS quantum partners needing demo material
- Academics writing papers who need reproducible benchmarks

## Revenue

- Free: 3 benchmark runs/month, no PDF export
- Pro ($99/month): unlimited runs, PDF export, saved history
- Team ($499/month): 5 seats, shared benchmark library, API access to results

---

## What "Benchmarking" Means Here

For a given problem (e.g., searching an unsorted list of N items):

| Metric | Quantum (AerSimulator) | Classical (Python) |
|---|---|---|
| Circuit depth | measured | — |
| Gate count | measured | — |
| CNOT count | measured | — |
| Qubits used | measured | — |
| Simulation time (ms) | measured | measured |
| Theoretical complexity | O(√N) shots | O(N) operations |
| Speedup factor | computed | baseline |

The tool does NOT claim to benchmark on real quantum hardware (which would be misleading). It clearly labels results as "AerSimulator (noiseless)" and explains what real hardware would add (noise, decoherence).

---

## Benchmark Problem Templates

Start with 6 built-in problem templates. Users can also use free-form Circuit Composer mode.

### Template 1: Unstructured Search (Grover's vs Linear Scan)
- User picks: N items, target item index
- Quantum: Grover's algorithm circuit (auto-generated for N up to 2^8)
- Classical: linear scan, binary search
- Key metric: query complexity, circuit depth

### Template 2: Random Number Generation (Quantum vs PRNG)
- User picks: bit width (1–16 bits)
- Quantum: H gate applied to N qubits, measured
- Classical: Python `secrets.randbits(N)`, `random.getrandbits(N)`
- Key metric: true entropy (quantum) vs PRNG period, throughput

### Template 3: Integer Factoring (Shor's vs Trial Division / Pollard's Rho)
- Fixed to N=15 (circuit already exists in `shor.py`)
- Classical: trial division (already exists in `rsa.py`), Pollard's rho
- Key metric: step count, time, theoretical scaling

### Template 4: Fourier Transform (QFT vs FFT)
- User picks: register size (2–4 qubits = 4–16 points)
- Quantum: QFT circuit (using `QFTGate`)
- Classical: `numpy.fft.fft` on same-length array
- Key metric: gate count vs FLOPS, circuit depth

### Template 5: Optimization (QAOA vs Brute Force)
- User picks: Max-Cut problem on 3–5 nodes
- Quantum: 1-layer QAOA circuit
- Classical: brute force over 2^N cuts
- Key metric: solution quality vs iteration count

### Template 6: Free-Form (Circuit Composer)
- User builds any circuit in the embedded composer
- Benchmarks: circuit stats only (depth, gates, qubits, simulation time)
- No classical comparison (user defines the problem)

---

## Backend Architecture

### New Files to Create

```
backend/
  models/
    benchmark_models.py       — BenchmarkRun, BenchmarkResult, ComparisonMetrics
  routers/
    benchmark.py              — run, list, get, delete endpoints
  quantum/
    benchmark_runner.py       — quantum circuit execution + metrics extraction
  classical/
    classical_solvers.py      — linear search, Pollard's rho, FFT, brute-force Max-Cut
  services/
    pdf_generator.py          — generate PDF report from benchmark result
```

### Supabase Table

```sql
create table benchmark_runs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  template        text not null,              -- 'grover' | 'rng' | 'shor' | 'qft' | 'qaoa' | 'freeform'
  parameters      jsonb not null,             -- template-specific inputs (N, target, etc.)
  quantum_result  jsonb not null,             -- depth, gate_count, cnot_count, sim_time_ms, statsvector summary
  classical_result jsonb,                     -- steps, time_ms, complexity_label (null for freeform)
  speedup_factor  float,                      -- quantum_steps / classical_steps (null if not comparable)
  pdf_url         text,                       -- Supabase Storage URL (null until exported)
  created_at      timestamptz default now()
);
```

### New API Endpoints

```
POST /benchmark/run                    — run a benchmark (template + params), requires auth for >3/month
GET  /benchmark/runs                   — list current user's runs (paginated)
GET  /benchmark/runs/{id}              — get single run result
POST /benchmark/runs/{id}/export-pdf   — generate + upload PDF, return URL (Pro only)
DELETE /benchmark/runs/{id}            — delete a run
GET  /benchmark/templates              — list available templates with descriptions
```

### benchmark_runner.py

```python
def run_quantum(template: str, params: dict) -> QuantumMetrics:
    """
    Build and run the quantum circuit for a given template.
    Returns: depth, gate_count, cnot_count, qubit_count,
             sim_time_ms, shots, measurement_distribution
    """
    # Route to template-specific circuit builders
    # Reuse existing: shor.py for 'shor', circuit_builder.py for 'freeform'
    # New: grover_circuit(), qft_circuit(), qaoa_circuit() for others

def run_classical(template: str, params: dict) -> ClassicalMetrics:
    """
    Run the classical equivalent and measure.
    Returns: steps, time_ms, complexity_label, result
    """
    # Route to classical_solvers.py functions
```

### classical_solvers.py

Implement these classical algorithms with step counting:

```python
def linear_search(items: list, target: int) -> ClassicalResult: ...
def pollards_rho(n: int) -> ClassicalResult: ...
def numpy_fft(data: list) -> ClassicalResult: ...
def brute_force_maxcut(adjacency: list[list]) -> ClassicalResult: ...
def prng_bits(n_bits: int) -> ClassicalResult: ...
```

### pdf_generator.py

Use `reportlab` (Python PDF library) to generate:
- Cover: benchmark title, date, user, template
- Section 1: Quantum circuit diagram (text/ASCII from Qiskit)
- Section 2: Metrics table (quantum vs classical side by side)
- Section 3: Speedup analysis and complexity comparison
- Section 4: Interpretation notes ("what this means for your use case")
- Footer: "Generated by Quantum Expedition — AerSimulator (noiseless)"

Upload the PDF to Supabase Storage, return a signed URL.

---

## Frontend Architecture

### New Files to Create

```
frontend/src/
  pages/
    BenchmarkPage.tsx         — template selector + run history
    BenchmarkRunPage.tsx      — live run progress + results display
  hooks/
    useBenchmark.ts           — fetch templates, submit run, poll result, trigger export
  api/
    benchmarkApi.ts           — axios wrappers
  types/
    benchmark.ts              — TypeScript interfaces
  components/
    benchmark/
      TemplateCard.tsx        — template selector card
      MetricsTable.tsx        — quantum vs classical side-by-side table
      SpeedupChart.tsx        — bar chart: quantum steps vs classical steps
      ComplexityBadge.tsx     — O(√N) vs O(N) visual badge
      CircuitStats.tsx        — depth / gate count / qubit count display
      ExportButton.tsx        — PDF export (Pro gate)
      RunHistoryList.tsx      — list of past runs with quick stats
```

### Key Pages

**`/benchmark`** — Main page
- 6 template cards (Grover, RNG, Shor, QFT, QAOA, Free-Form)
- Each card: icon, title, "quantum vs classical" tagline, difficulty badge
- Below templates: run history list (last 10 runs, quick summary)
- Free users: "3 runs remaining this month" indicator

**`/benchmark/run/:id`** — Results page
- Top: template name, parameters used, timestamp
- Quantum panel: circuit stats (depth, gates, qubits, sim time)
- Classical panel: algorithm used, steps, time
- Center: speedup factor badge (large, prominent)
- Complexity comparison section (theoretical O() notation)
- "What this means" plain-English explanation (Claude agent)
- Export to PDF button (Pro only, greyed with upgrade prompt for free)

### Reusing Existing Components

- **Circuit Composer** (`CircuitComposerPage.tsx`) — Free-form template embeds it directly. No changes to composer itself.
- **MeasurementChart** from `RSAPage.tsx` — reuse for quantum measurement distribution display
- **ScaleComparison** from `RSAPage.tsx` — reuse or adapt for complexity comparison

---

## AI Integration

Add a **BenchmarkAnalyst** Claude agent:

- Triggered after a run completes
- Receives: template, parameters, quantum metrics, classical metrics, speedup factor
- Returns: plain-English interpretation — "For your problem size, quantum shows a 1.4× speedup. At N=1024 this would be 32×. Here's when quantum becomes worth it for this problem type…"
- Streamed via SSE
- Available to Pro and Team tiers

```
backend/agents/benchmark_analyst.py
GET /agents/benchmark-analyst/stream?run_id=
```

---

## Complexity Scaling Explainer

For each template, pre-compute and show a scaling table:

| N (problem size) | Classical steps | Quantum steps (theoretical) | Crossover |
|---|---|---|---|
| 16 | 16 | 4 | quantum wins at N>16 |
| 256 | 256 | 16 | — |
| 65536 | 65536 | 256 | — |

This table is static (pre-computed per template) but parametrized by user's N. It's a key investor demo moment — showing the exponential quantum advantage at scale.

---

## PDF Report Structure

```
Page 1: Cover
  - "Quantum Benchmark Report"
  - Template: Grover's Search vs Linear Scan
  - Parameters: N=16, target=7
  - Run date, user email
  - Generated by Quantum Expedition

Page 2: Quantum Circuit
  - Circuit diagram (ASCII art from Qiskit .draw())
  - Stats: depth=12, gates=18, CNOTs=6, qubits=4, sim_time=43ms

Page 3: Classical Comparison
  - Algorithm: Linear Scan
  - Steps taken: 16, Time: 0.001ms
  - Pollard's Rho (for factoring template): steps, time

Page 4: Speedup Analysis
  - Speedup factor at current N: 1.8×
  - Theoretical speedup at N=1M: 1000×
  - Complexity graph (ASCII or embedded chart image)

Page 5: Interpretation
  - Claude-generated plain-English analysis
  - "When does quantum win for this problem type?"
  - Caveats: noise, error correction not modeled
  - Footer: disclaimer
```

---

## Implementation Order

1. `benchmark_models.py` Pydantic models
2. `classical_solvers.py` (linear search, Pollard's rho, FFT, brute-force MaxCut)
3. New quantum circuit builders: `grover_circuit.py`, `qft_benchmark.py`, `qaoa_circuit.py`
4. `benchmark_runner.py` (routes template → quantum + classical execution)
5. Supabase table migration
6. `benchmark.py` router (run, list, get, delete endpoints)
7. `benchmarkApi.ts` + types
8. `useBenchmark.ts` hook
9. `BenchmarkPage.tsx` (template selector)
10. `BenchmarkRunPage.tsx` (results display)
11. `pdf_generator.py` + `reportlab` dependency + export endpoint
12. `ExportButton.tsx` + Pro gate
13. `BenchmarkAnalyst` agent

---

## Dependencies to Add

```
# requirements.txt additions
reportlab==4.2.0        # PDF generation
```

---

## What Does NOT Change

- All existing routes and pages
- Circuit Composer — embedded by reference in free-form template
- `shor.py` — reused directly for the Shor template
- `circuit_builder.py` — reused for free-form template execution
- All agents, auth, credits, Stripe
