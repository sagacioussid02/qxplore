---
generated_at: 2026-05-24T10:39:13.634998+00:00
commit_sha: 1c6cee08e1348c0eea56b5d3d4097d9fcaa84d6c
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

Quantumanic is a quantum circuit simulation service with two distinct layers: a Node.js/Express API layer (the primary, original service) and a Python/FastAPI backend layer (added later), fronted by a React/TypeScript frontend.

## Node.js Core Service

The root-level service is described as "a quantum computing simulator and API service built with Express.js and mathjs" (`README.md:1-3`). The entry point is `src/index.js` (`src/index.js`), with quantum simulation logic under `src/quantum/` and API routing under `src/api/`. Tests live at `tests/rate-limit.test.js` and `tests/simulator.test.js`.

Key runtime configuration is injected via environment variables (`README.md:20-25`):
- `PORT` — server port (default 3000)
- `RATE_LIMIT_WINDOW_MS` — rate-limit window in ms (default 900 000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` — max requests per IP on general `/api` routes (default 100)
- `CIRCUIT_RUN_RATE_LIMIT` — max requests per IP on `POST /api/circuit/run` (default 10)

The Node.js service exposes a single primary endpoint: `POST /api/circuit/run` (`README.md:37`), which accepts a JSON body containing `numQubits` and a `circuit.gates` array and returns a state vector.

## Python / FastAPI Backend

A second, independent backend lives under `backend/` (`backend/main.py`, `backend/run.py`). Its internal structure is:

| Subdirectory | Purpose |
|---|---|
| `backend/agents/` | Agent-based orchestration logic |
| `backend/classical/` | Classical computation helpers |
| `backend/core/` | Shared core utilities |
| `backend/data/` | Data access / persistence helpers |
| `backend/models/` | Pydantic or ORM model definitions |
| `backend/quantum/` | Quantum simulation logic (Python) |
| `backend/routers/` | FastAPI route handlers |
| `backend/tests/` | Python test suite |

Dependencies for this layer are declared in `backend/requirements.txt`.

## Frontend

The frontend is a Vite + React + TypeScript application (`frontend/package.json`, `frontend/index.html`, `frontend/vite.config.ts`). It uses Tailwind CSS (`frontend/tailwind.config.js`) and PostCSS (`frontend/postcss.config.js`). The source tree lives under `frontend/src/`. Notably, the frontend directory also contains its own `frontend/backend/` subdirectory with a separate `frontend/backend/requirements.txt`, suggesting a BFF (Backend-for-Frontend) pattern or a co-located proxy layer.

## Infrastructure & Deployment

The service is containerised via `Dockerfile`. Infrastructure-as-code is managed with Terraform (`terraform/main.tf`, `terraform/backend.tf`, `terraform/variables.tf`, `terraform/outputs.tf`, `terraform/versions.tf`), with a bootstrap stage (`terraform/bootstrap/`) and reusable modules (`terraform/modules/`). A `terraform.tfvars.example` provides a template for variable values.

CI/CD is handled by GitHub Actions workflows (`.github/workflows/`):

| Workflow | Purpose |
|---|---|
| `deploy.yml` | Deploy the service |
| `destroy.yml` | Tear down infrastructure |
| `bootstrap.yml` | Bootstrap Terraform state backend |
| `auto-pr.yml` | Automated PR creation |
| `claude-review.yml` | AI-assisted code review |
| `secret-scan.yml` | Gitleaks secret scanning |

A shared CI/CD library is vendored under `cicd-library/` (`cicd-library/README.md`), containing reusable GitHub workflow templates (`cicd-library/github-workflows/`), scripts (`cicd-library/scripts/`), and Terraform modules (`cicd-library/terraform/`).

A Supabase-backed persistence layer is referenced by `supabase_schema.sql`, indicating the Python backend (or BFF) uses Supabase (PostgreSQL) for storage.

---

# Data model & flows

## Quantum Circuit Request/Response (Node.js)

The primary data flow through the Node.js service is:

1. **Client → `POST /api/circuit/run`** — sends a JSON payload (`README.md:38-47`):
   ```json
   {
     "numQubits": 2,
     "circuit": {
       "gates": [
         { "type": "X", "target": 0 },
         ...
       ]
     }
   }
   ```
2. **Rate-limit middleware** — enforces per-IP limits before the request reaches the handler (`README.md:22-25`). Tests for this layer live in `tests/rate-limit.test.js`.
3. **Simulator** — the quantum simulation engine (under `src/quantum/`) applies gates sequentially to a state vector. Supported gate types are X, H, Z, Y, S, and T (`README.md:5`). Simulator correctness is validated in `tests/simulator.test.js`.
4. **Response** — the resulting state vector is returned to the client.

## Supabase / Database Schema

Persistent data (teams, brackets, results, or user state) is modelled in `supabase_schema.sql`. The schema targets a Supabase (PostgreSQL) instance. The Python backend's `backend/data/` and `backend/models/` directories contain the application-side representations of these entities.

## Python Backend Internal Flow

Requests to the Python service enter via FastAPI routers (`backend/routers/`), are processed through core utilities (`backend/core/`) and optionally delegated to agent logic (`backend/agents/`). Quantum computations are handled by `backend/quantum/`, classical computations by `backend/classical/`. Persistence is mediated through `backend/data/`, with data shapes defined in `backend/models/`.

## Frontend ↔ Backend Communication

The React frontend (`frontend/src/`) communicates with one or both backends. The presence of `frontend/backend/` with its own `frontend/backend/requirements.txt` suggests a Python-based BFF or proxy that the frontend calls directly, which in turn fans out to the main `backend/` service or Supabase.

## Environment & Secrets Flow

Secrets and configuration are never inlined; they are referenced by name in `.env.example` and injected at runtime (`README.md:17-25`). The `.gitleaks.toml` configuration and the `secret-scan` CI workflow (`.github/workflows/secret-scan.yml`) enforce that no secret values are committed to the repository.

# Infra & deploy topology

## Containerisation

The service is packaged as a Docker image via `Dockerfile` (root-level). Build-time exclusions are controlled by `.dockerignore`. The image encapsulates the Node.js/Express quantum simulation service whose entry point is `src/index.js` and whose runtime port defaults to `3000` (`README.md:20`).

## Infrastructure-as-Code (Terraform)

All cloud resources are declared in Terraform under `terraform/`:

| File | Role |
|---|---|
| `terraform/main.tf` | Primary resource definitions |
| `terraform/backend.tf` | Remote state backend configuration |
| `terraform/variables.tf` | Input variable declarations |
| `terraform/outputs.tf` | Output value declarations |
| `terraform/versions.tf` | Provider and Terraform version constraints |

A bootstrap stage (`terraform/bootstrap/`) provisions the prerequisites for the remote state backend (e.g., S3 bucket / DynamoDB table or equivalent) before the main Terraform root module can be initialised. Reusable resource patterns are extracted into `terraform/modules/`. Variable values are templated in `terraform.tfvars.example`.

A parallel, vendored CI/CD library at `cicd-library/terraform/` provides additional shared Terraform modules that can be consumed across projects (`cicd-library/README.md`).

## CI/CD Pipelines (GitHub Actions)

All automation runs through `.github/workflows/`:

| Workflow | Trigger / Purpose |
|---|---|
| `.github/workflows/bootstrap.yml` | Provisions the Terraform state backend (runs before `deploy.yml`) |
| `.github/workflows/deploy.yml` | Builds the Docker image and applies Terraform to deploy the service |
| `.github/workflows/destroy.yml` | Tears down all Terraform-managed infrastructure |
| `.github/workflows/auto-pr.yml` | Automates pull-request creation for agent-generated branches |
| `.github/workflows/claude-review.yml` | AI-assisted peer code review gate |
| `.github/workflows/secret-scan.yml` | Runs Gitleaks against every push/PR to prevent secret leakage (config: `.gitleaks.toml`) |

Reusable workflow templates and helper scripts are vendored in `cicd-library/github-workflows/` and `cicd-library/scripts/` respectively (`cicd-library/README.md`).

## Multi-Layer Application Topology

Three distinct runtime layers are present in the repository:

1. **Node.js/Express service** — root-level (`src/index.js`, `src/quantum/`, `src/api/`). Exposes `POST /api/circuit/run` (`README.md:37`). Declared dependencies in root `package.json`.
2. **Python/FastAPI backend** — `backend/main.py`, `backend/run.py`, with routers at `backend/routers/`, agent logic at `backend/agents/`, and quantum simulation at `backend/quantum/`. Dependencies declared in `backend/requirements.txt`.
3. **React/TypeScript frontend** — Vite-based SPA under `frontend/src/` (`frontend/package.json`, `frontend/vite.config.ts`). A co-located BFF or proxy layer lives at `frontend/backend/` with its own `frontend/backend/requirements.txt`, suggesting a Python-based Backend-for-Frontend pattern.

## Persistence

A Supabase (PostgreSQL) instance is used for persistent storage. The schema is defined in `supabase_schema.sql`. Application-side data access is mediated through `backend/data/` and `backend/models/`.

## Environment & Secrets Injection

No secret values are inlined in the repository. Configuration is injected at runtime via environment variables documented in `.env.example`. Key variables include (`README.md:20-25`):

- `PORT` — server port (default `3000`)
- `RATE_LIMIT_WINDOW_MS` — rate-limit window in ms (default `900000`)
- `RATE_LIMIT_MAX_REQUESTS` — max requests per IP on general `/api` routes (default `100`)
- `CIRCUIT_RUN_RATE_LIMIT` — max requests per IP on `POST /api/circuit/run` (default `10`)

Secret hygiene is enforced at commit time by `.gitleaks.toml` and at CI time by `.github/workflows/secret-scan.yml`.

## Local Development Bootstrap

A convenience script `start.sh` is present at the repository root for local startup. Hook scaffolding for developer workstations is provided by `scripts/setup-hooks.sh` and the hooks under `scripts/hooks/`, with Claude-specific hooks under `.claude/hooks/` (audit logging, cost tracking, PR automation, and environment/production protection guards — `.claude/settings.json`).

# Security posture

## Secret Management & Leak Prevention

Secret hygiene is enforced at two layers. A Gitleaks configuration (`.gitleaks.toml`) defines scanning rules, and the dedicated CI workflow (`.github/workflows/secret-scan.yml`) runs Gitleaks against every push and pull request to prevent secret values from entering the repository. Runtime configuration is never inlined; all sensitive values are referenced by name only and injected via environment variables documented in `.env.example`. The `.gitignore` and `.dockerignore` files provide additional exclusion layers to prevent accidental inclusion of `.env` files in commits or container images.

## Claude Agent Hook Guardrails

A suite of shell hooks under `.claude/hooks/` enforces security controls on agent-driven operations:

- **`.claude/hooks/protect-env.sh`** — guards against reads or modifications of environment/secret files.
- **`.claude/hooks/protect-git-push.sh`** — prevents direct pushes to protected branches.
- **`.claude/hooks/protect-prod.sh`** — blocks destructive operations against production resources.
- **`.claude/hooks/protect-destructive.sh`** — general guard against destructive commands.
- **`.claude/hooks/audit-log.sh`** — records agent actions to an audit trail.
- **`.claude/hooks/security-scan.sh`** — runs security scanning as part of the agent workflow.

Hook configuration is declared in `.claude/settings.json` and `.claude/settings.local.json`.

## Rate Limiting & Input Validation

The Node.js/Express service implements per-IP rate limiting on all API routes, with tighter limits on the compute-intensive endpoint. Configuration is injected via environment variables (`README.md:22-25`):

- `RATE_LIMIT_WINDOW_MS` — window duration (default 900 000 ms / 15 min)
- `RATE_LIMIT_MAX_REQUESTS` — ceiling for general `/api` routes (default 100)
- `CIRCUIT_RUN_RATE_LIMIT` — ceiling for `POST /api/circuit/run` (default 10)

Rate-limit behaviour is covered by an automated test suite at `tests/rate-limit.test.js`. Input validation for the circuit endpoint is called out explicitly as a security feature (`README.md:8`).

## CI/CD Security Gates

The GitHub Actions pipeline includes a mandatory AI-assisted code review gate (`.github/workflows/claude-review.yml`) and automated PR creation controls (`.github/workflows/auto-pr.yml`). The `destroy.yml` workflow (`.github/workflows/destroy.yml`) is isolated from the standard deploy path, reducing the blast radius of accidental or malicious infrastructure teardown. A bootstrap workflow (`.github/workflows/bootstrap.yml`) separates state-backend provisioning from application deployment.

## Dependency Audit Trail

A `DEPENDENCY_AUDIT.md` file is present at the repository root, indicating that third-party dependency risk is tracked explicitly. Dependencies are declared across three distinct manifests — `package.json` (Node.js root service), `backend/requirements.txt` (Python/FastAPI backend), and `frontend/package.json` (React frontend) — plus a fourth at `frontend/backend/requirements.txt` for the co-located BFF layer. ESLint is configured via `.eslintrc.json` and `frontend/eslint.config.js` to enforce code-quality rules that reduce the surface for injection and logic errors.

## Infrastructure Hardening

Terraform state is managed remotely (`.github/workflows/bootstrap.yml`, `terraform/backend.tf`), preventing local state files containing sensitive resource metadata from being committed. Variable values are templated in `terraform.tfvars.example` rather than committed directly. Reusable Terraform modules are vendored in `cicd-library/terraform/` and `terraform/modules/`, enabling consistent, reviewed infrastructure patterns across deployments.

## Identified Gaps & Risks

1. **No SAST or SCA workflow visible.** The CI pipeline includes secret scanning (`.github/workflows/secret-scan.yml`) but no static application security testing (e.g., Semgrep, Bandit for Python, or `npm audit` enforcement) or software-composition analysis workflow is evident from the directory tree or CI file list. This leaves dependency vulnerabilities and code-level security bugs without an automated detection layer.

2. **Multiple independent dependency manifests.** Four separate dependency files (`package.json`, `backend/requirements.txt`, `frontend/package.json`, `frontend/backend/requirements.txt`) increase the operational burden of keeping all layers patched. The `DEPENDENCY_AUDIT.md` file suggests awareness of this risk, but automated enforcement is not confirmed by the available CI files.

3. **`frontend/backend/` co-location.** The presence of a separate Python runtime inside the frontend directory (`frontend/backend/requirements.txt`) introduces an additional attack surface that may not be covered by the same security controls applied to the primary `backend/` service.

4. **`test_ttt.py` at repository root.** A loose test file (`test_ttt.py`) at the root level is outside the structured test directories (`backend/tests/`, `tests/`). Unstructured test files can inadvertently import or expose internal modules in ways not covered by the main test harness.

5. **`ncaainfo.txt` and `cbs-sports-2026-bracket.pdf` in repository.** Binary and plain-text data files committed to the repository (`ncaainfo.txt`, `cbs-sports-2026-bracket.pdf`) may contain personally identifiable or proprietary information and should be reviewed for data-classification compliance.

# Hot spots

1. **Fragmented dependency surface across four manifests.** The repository maintains independent dependency declarations in `package.json` (Node.js root service), `backend/requirements.txt` (Python/FastAPI backend), `frontend/package.json` (React frontend), and `frontend/backend/requirements.txt` (co-located BFF layer). Any one of these can drift out of patch compliance without the others signalling it. The existence of `DEPENDENCY_AUDIT.md` at the root acknowledges the risk, but no automated SCA or `npm audit` enforcement workflow is visible among the CI files (`.github/workflows/`).

2. **Loose artefacts committed to the repository root.** Two data files — `ncaainfo.txt` and `cbs-sports-2026-bracket.pdf` — sit at the repository root alongside source code. Binary and plain-text data files committed to version control can contain proprietary or personally identifiable information and are not subject to the same access controls as runtime secrets. Their presence alongside `supabase_schema.sql` (which describes the live persistence schema) compounds the data-classification risk.

3. **`test_ttt.py` outside all structured test directories.** A standalone test file (`test_ttt.py`) lives at the repository root, outside both `backend/tests/` and `tests/`. Files outside the structured test harness are not guaranteed to be executed by CI, may import internal modules in unreviewed ways, and can accumulate stale or incorrect assertions without detection.

4. **`frontend/backend/` as an uncontrolled fourth runtime.** The presence of `frontend/backend/requirements.txt` indicates a Python runtime co-located inside the frontend directory tree. This layer is architecturally distinct from `backend/` but shares no visible CI security gate of its own. It represents an additional attack surface that may not be covered by the same controls (rate limiting, input validation, secret scanning) applied to the primary backend.

5. **Single-commit history visible.** The recent-commits listing shows only one commit (`1c6cee0`) in the available window. This makes it impossible to assess velocity, review cadence, or whether CI gates are being exercised regularly. It is a hot spot for process risk: if the repository was bulk-initialised in a single commit, the full change history and review trail may be absent.

---

# Tech-debt register

| # | Item | Location | Severity | Notes |
|---|------|----------|----------|-------|
| TD-01 | No SAST or SCA workflow | `.github/workflows/` | High | Secret scanning exists (`.github/workflows/secret-scan.yml`) but no static analysis (Semgrep, Bandit, `npm audit --audit-level`) is present in the CI file list. Dependency vulnerabilities and code-level security bugs have no automated detection layer. |
| TD-02 | Four independent dependency manifests with no unified patch policy | `package.json`, `backend/requirements.txt`, `frontend/package.json`, `frontend/backend/requirements.txt` | High | `DEPENDENCY_AUDIT.md` records awareness but no automated enforcement is confirmed by the available CI files. |
| TD-03 | `frontend/backend/` BFF layer lacks clear ownership and CI coverage | `frontend/backend/requirements.txt` | Medium | A Python runtime inside the frontend directory is architecturally ambiguous. It is unclear whether it is deployed independently, proxied through the frontend build, or tested at all. |
| TD-04 | `test_ttt.py` is outside the structured test harness | `test_ttt.py` | Medium | Not co-located with `backend/tests/` or `tests/`. Likely not executed by CI. Represents unreviewed test logic at the repository root. |
| TD-05 | `supabase_schema.sql` committed to repository root | `supabase_schema.sql` | Medium | The live database schema is version-controlled in plain SQL at the root. Schema migrations are not evidenced by a dedicated migrations directory or tool (e.g., Alembic, Flyway), raising the risk of schema drift between environments. |
| TD-06 | Data files (`ncaainfo.txt`, `cbs-sports-2026-bracket.pdf`) in version control | `ncaainfo.txt`, `cbs-sports-2026-bracket.pdf` | Medium | Binary and plain-text data committed to the repo are not subject to secret-scanning rules in `.gitleaks.toml` and may contain proprietary or PII data. |
| TD-07 | No TODO/FIXME markers found | (none reported by tooling) | Low | The absence of inline debt markers may indicate clean code or, equally, that debt is not being tracked inline. Given the single-commit history, this cannot be distinguished without deeper file reads. |
| TD-08 | Dual quantum simulation implementations (Node.js and Python) | `src/quantum/` (Node.js), `backend/quantum/` (Python) | Low | Two independent quantum simulation engines exist in the same repository. Without a clear ownership boundary or deprecation plan, they will diverge in gate support, correctness, and maintenance burden. The Node.js service documents gates X, H, Z, Y, S, T (`README.md:5`); the Python layer's gate coverage is undocumented in the available readings. |
| TD-09 | `terraform.tfvars.example` present but no `terraform.tfvars` validation in CI | `terraform.tfvars.example`, `terraform/variables.tf` | Low | Variable values are templated but there is no visible CI step that validates Terraform plans against a known variable set, leaving infrastructure changes untested until `deploy.yml` runs. |

---

# Recent incidents (last 90d)

The only commit visible in the recent-commits window is:

> `1c6cee0` — `docs: add LESSONS_LEARNED.md (operator-curated incident log) (#25)`

This commit introduces a `LESSONS_LEARNED.md` file (`LESSONS_LEARNED.md`), described in the commit message as an "operator-curated incident log." The file exists in the repository tree (`LESSONS_LEARNED.md`) but its contents were not included in the provided repo readings, so individual incident entries cannot be cited directly.

**What can be stated with confidence:**
- An operator-maintained incident log exists at `LESSONS_LEARNED.md` and was added within the 90-day window covered by the commit history provided.
- The commit was merged via pull request `#25`, indicating it passed at least the PR-creation gate (`.github/workflows/auto-pr.yml`) and presumably the AI review gate (`.github/workflows/claude-review.yml`).

**What cannot be stated without fabrication:**
- The number, nature, or severity of incidents recorded in `LESSONS_LEARNED.md` — the file contents were not surfaced in the repo readings.
- Whether any incidents relate to the rate-limiting layer (`tests/rate-limit.test.js`), the quantum simulator (`tests/simulator.test.js`), the Terraform infrastructure, or the Supabase persistence layer.

> ⚠️ **Gap:** The operator should surface the contents of `LESSONS_LEARNED.md` in the next dossier cycle so that incident patterns can be analysed and mapped to the tech-debt register above.

---

# Open questions for operator

1. **What is the intended relationship between the Node.js quantum simulator (`src/quantum/`) and the Python quantum simulator (`backend/quantum/`)?** Are they serving different clients, or is one slated for deprecation? Without a clear ownership boundary, both will accumulate independent bugs and gate-coverage gaps.

2. **What does `LESSONS_LEARNED.md` contain?** The file was added as an "operator-curated incident log" (`1c6cee0`) but its contents were not available in the repo readings. Surfacing the incident entries is necessary to close the gap in the Recent Incidents section and to validate whether any open tech-debt items (TD-01 through TD-09) are already known failure modes.

3. **Is `frontend/backend/` a deployed service, a development proxy, or an artefact of a refactor?** The presence of `frontend/backend/requirements.txt` implies a live Python runtime, but its deployment topology, CI coverage, and ownership are unclear. If it is deployed, it needs the same security gates as `backend/`.

4. **What is the data-classification status of `ncaainfo.txt` and `cbs-sports-2026-bracket.pdf`?** These files are committed to the repository root. If they contain proprietary sports data or PII, they may need to be removed from history and stored in a controlled artefact store rather than version control.

5. **Is there a schema migration strategy for `supabase_schema.sql`?** The file represents the database schema but there is no visible migrations directory or tool. How are schema changes applied to staging and production environments, and how is drift detected?

6. **What is the intended scope of `test_ttt.py`?** The file sits outside all structured test directories (`test_ttt.py`). Is it a throwaway scratch file, an integration test, or a test for a feature not yet integrated into the main harness? It should either be moved into `backend/tests/` or `tests/` and wired into CI, or deleted.

7. **Is there a plan to introduce SAST/SCA into CI?** The current pipeline has secret scanning (`.github/workflows/secret-scan.yml`) but no static analysis or dependency vulnerability scanning. Given four independent dependency manifests, the operator should decide on tooling (e.g., Dependabot, Snyk, Bandit, Semgrep) and the acceptable vulnerability threshold before the service handles production traffic.

8. **What cloud provider and region is Terraform targeting?** `terraform/variables.tf` and `terraform.tfvars.example` exist but their contents were not surfaced. Understanding the target environment is necessary to assess blast radius for the `destroy.yml` workflow and to validate that the bootstrap state backend (`terraform/bootstrap/`) is correctly isolated from the application stack.
