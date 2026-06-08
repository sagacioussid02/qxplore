---
generated_at: 2026-06-07T10:50:57.338133+00:00
commit_sha: ac8b84c2edd361a26c4a20f50765d59dc13f89b1
crew: discoverer/v1
sections_present: [architecture, data, infra, security, hot_spots, tech_debt, incidents, questions]
---

# Architecture

Quantumanic is a full-stack quantum circuit simulation platform composed of three primary layers: a React/TypeScript frontend, a dual-backend API tier (Node.js/Express.js and Python/FastAPI), and cloud infrastructure managed via Terraform.

## Frontend

The frontend is a React 18+ single-page application built with Vite and TypeScript (`frontend/package.json:1-5`). It uses Tailwind CSS for styling (`frontend/tailwind.config.js`) and PostCSS for CSS processing (`frontend/postcss.config.js`). The application entry point is `frontend/index.html`, with source code under `frontend/src/`. ESLint is configured at `frontend/eslint.config.js` and TypeScript compilation is governed by `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, and `frontend/tsconfig.node.json`.

## Dual-Backend Architecture

The project explicitly adopts a dual-backend strategy, documented in `ARCHITECTURE.md` and referenced in `README.md:14-15`. Two backend runtimes coexist:

1. **Node.js/Express.js backend** — handles API routing, rate limiting, and input validation middleware. Its entry point is `src/index.js` (`src/index.js`), with API routes under `src/api/` and quantum simulation utilities under `src/quantum/`. The root `package.json` governs its dependencies.

2. **Python/FastAPI backend** — provides the quantum simulation engine. Its entry point is `backend/main.py` (`backend/main.py`) with an alternate runner at `backend/run.py`. It is organized into sub-packages:
   - `backend/agents/` — agent-based logic
   - `backend/classical/` — classical computation helpers
   - `backend/core/` — core application logic
   - `backend/data/` — data access layer
   - `backend/models/` — Pydantic or ORM models
   - `backend/quantum/` — quantum gate and circuit simulation
   - `backend/routers/` — FastAPI route definitions
   - Python dependencies are declared in `backend/requirements.txt`

A secondary `frontend/backend/` directory exists with its own `frontend/backend/requirements.txt`, suggesting a co-located backend stub or proxy used during frontend development.

## Containerization

The application is containerized via a single `Dockerfile` at the repository root. The `.dockerignore` file controls build context exclusion. The `start.sh` script provides a convenience launcher.

## Infrastructure

Cloud infrastructure is defined with Terraform under `terraform/`. Key files include:
- `terraform/main.tf` — primary resource definitions
- `terraform/backend.tf` — remote state configuration
- `terraform/variables.tf` and `terraform/outputs.tf` — input/output declarations
- `terraform/versions.tf` — provider version constraints
- `terraform/modules/` — reusable Terraform modules
- `terraform/bootstrap/` — bootstrapping resources (e.g., state bucket)
- `terraform.tfvars.example` — example variable values

A shared CI/CD library is vendored at `cicd-library/`, containing reusable GitHub Actions workflows (`cicd-library/github-workflows/`), scripts (`cicd-library/scripts/`), and Terraform modules (`cicd-library/terraform/`).

## CI/CD

Six GitHub Actions workflows govern automation (`.github/workflows/`):
- `auto-pr.yml` — automatic pull request creation
- `bootstrap.yml` — infrastructure bootstrapping
- `claude-review.yml` — AI-assisted code review
- `deploy.yml` — application deployment
- `destroy.yml` — infrastructure teardown
- `secret-scan.yml` — secret detection via gitleaks (configured at `.gitleaks.toml`)

## Database

A Supabase-hosted PostgreSQL database is used, with the schema defined in `supabase_schema.sql`.

## Security & Governance Hooks

Claude hooks under `.claude/hooks/` enforce runtime guardrails: `protect-env.sh`, `protect-git-push.sh`, `protect-prod.sh`, `protect-destructive.sh`, `security-scan.sh`, `audit-log.sh`, `cost-tracker.sh`, `auto-draft-pr.sh`, and `notify-email.sh`. Settings are declared in `.claude/settings.json` and `.claude/settings.local.json`.

---

# Data model & flows

## Database Schema

The persistent data layer is a Supabase-hosted PostgreSQL database. The full schema is defined in `supabase_schema.sql`. No ORM migration files are present in the tree; the schema file is the single source of truth for table definitions.

Python-side model definitions reside in `backend/models/` and are used by the FastAPI backend to validate and serialize data exchanged with the database and API consumers.

## Quantum Circuit Data Flow

1. **User input** — A user constructs a quantum circuit in the React frontend (`frontend/src/`), specifying qubits and gate sequences (X, H, Z, Y, S, T, CNOT/CX, SWAP, Toffoli as enumerated in `README.md:22-24`).

2. **API request** — The frontend submits the circuit definition to the backend API. The Node.js layer (`src/api/`) receives the request, applies rate limiting and input validation middleware, then forwards it to the simulation engine.

3. **Quantum simulation** — The Python backend's `backend/quantum/` package performs matrix-based gate operations on the qubit state vector. Classical helpers in `backend/classical/` may assist with pre/post-processing. Agent logic in `backend/agents/` may orchestrate multi-step simulation workflows.

4. **Result serialization** — Simulation results (measurement outcomes and probability distributions) are serialized through `backend/routers/` (FastAPI route handlers) and returned as JSON to the caller.

5. **Frontend rendering** — The React frontend receives the probability/measurement output and renders it to the user.

## Node.js Quantum Utilities

A parallel quantum simulation path exists in the Node.js layer under `src/quantum/`, consistent with the project's Express.js heritage noted in `README.md:13`. This may serve as a lightweight simulation fallback or legacy path.

## Test Coverage Points

- Node.js-layer rate limiting is exercised by `tests/rate-limit.test.js`
- Simulator behavior is covered by `tests/simulator.test.js`
- Python backend tests reside under `backend/tests/`
- A standalone Python test script `test_ttt.py` exists at the repository root
- Jest configuration is at `jest.config.js` (root) with the root `package.json` governing test execution

## Environment & Secrets Flow

Environment variable names are documented in `.env.example`. Secrets are never inlined; they are referenced by name and injected at runtime via the deployment environment or CI secrets store. The `.claude/hooks/protect-env.sh` hook enforces this at the agent level.

# Infra & deploy topology

## Containerization

The application ships as a single Docker image defined at the repository root (`Dockerfile`). Build-context exclusions are governed by `.dockerignore`. A convenience launcher script `start.sh` is present at the root for local execution.

## Cloud Infrastructure (Terraform)

All cloud resources are declared with Terraform under `terraform/`:

- **Primary resources** — `terraform/main.tf`
- **Remote state backend** — `terraform/backend.tf`
- **Input variables** — `terraform/variables.tf`
- **Output declarations** — `terraform/outputs.tf`
- **Provider version constraints** — `terraform/versions.tf`
- **Reusable modules** — `terraform/modules/`
- **Bootstrap resources** (e.g., state bucket provisioning) — `terraform/bootstrap/`
- **Example variable values** — `terraform.tfvars.example`

A vendored CI/CD library at `cicd-library/` provides shared Terraform modules (`cicd-library/terraform/`), reusable GitHub Actions workflow templates (`cicd-library/github-workflows/`), and helper scripts (`cicd-library/scripts/`).

## CI/CD Pipelines

Six GitHub Actions workflows drive the full automation lifecycle (`.github/workflows/`):

| Workflow | File | Purpose |
|---|---|---|
| Auto PR | `.github/workflows/auto-pr.yml` | Automatic pull request creation |
| Bootstrap | `.github/workflows/bootstrap.yml` | Infrastructure bootstrapping (state bucket, IAM) |
| Claude Review | `.github/workflows/claude-review.yml` | AI-assisted code review gate |
| Deploy | `.github/workflows/deploy.yml` | Application deployment |
| Destroy | `.github/workflows/destroy.yml` | Infrastructure teardown |
| Secret Scan | `.github/workflows/secret-scan.yml` | Secret detection via gitleaks (`.gitleaks.toml`) |

## Database

The persistent layer is a Supabase-hosted PostgreSQL database. The full schema is defined in `supabase_schema.sql`. No ORM migration files are present; this file is the single source of truth for table structure.

## Dual-Backend Deployment Topology

The application runs two backend runtimes, as documented in `ARCHITECTURE.md` and noted in `README.md:14-15`:

1. **Node.js/Express.js** — entry point `src/index.js`, handles API routing, rate limiting, and input validation. Dependencies declared in `package.json`.
2. **Python/FastAPI** — entry point `backend/main.py`, alternate runner `backend/run.py`, provides the quantum simulation engine. Dependencies declared in `backend/requirements.txt`.

A co-located backend stub or development proxy exists at `frontend/backend/` with its own `frontend/backend/requirements.txt`, used during frontend development.

The React/TypeScript frontend is built with Vite (`frontend/package.json`) and served as a static single-page application from `frontend/index.html`.

## Security & Governance Hooks

Runtime guardrails are enforced via Claude hooks under `.claude/hooks/`:

- `protect-env.sh` — prevents secret inlining
- `protect-git-push.sh` — guards branch push rules
- `protect-prod.sh` — blocks unauthorized production changes
- `protect-destructive.sh` — intercepts destructive operations
- `security-scan.sh` — inline security scanning
- `audit-log.sh` — operation audit trail
- `cost-tracker.sh` — cloud cost monitoring
- `auto-draft-pr.sh` — automated PR drafting
- `notify-email.sh` — alerting notifications

Hook configuration is declared in `.claude/settings.json` and `.claude/settings.local.json`.

## Environment & Secrets

Environment variable names are documented in `.env.example`. Secrets are never inlined; they are injected at runtime via the deployment environment or CI secrets store. The `protect-env.sh` hook enforces this constraint at the agent level.

# Security posture

## Overview

Quantumanic has a layered security posture spanning secret management, CI/CD controls, runtime guardrails, input validation, and infrastructure governance. The following assessment is grounded exclusively in the repository readings provided.

---

## Secret Management

Secrets are never inlined in source. Environment variable names are documented by reference only in `.env.example`, and the `.gitignore` ensures `.env` files are excluded from version control. The Claude hook `.claude/hooks/protect-env.sh` enforces this constraint at the agent level, blocking any attempt to read or inline secret material at runtime. The `.dockerignore` file further prevents accidental inclusion of sensitive files in Docker build contexts (`Dockerfile`, `.dockerignore`).

---

## Secret Scanning in CI

A dedicated secret-scanning workflow runs in CI via `.github/workflows/secret-scan.yml`, powered by gitleaks with project-specific configuration at `.gitleaks.toml`. This provides automated detection of accidentally committed credentials on every push or pull request, forming a continuous backstop against secret leakage.

---

## Branch and Push Protection

The Claude hook `.claude/hooks/protect-git-push.sh` guards branch push rules at the agent level, enforcing that commits to `main`/`master` are blocked and changes flow through pull requests. The `.github/workflows/auto-pr.yml` workflow automates PR creation, ensuring changes are always reviewed before merge. The `.github/workflows/claude-review.yml` workflow adds an AI-assisted code review gate as an additional check before operator review.

---

## Runtime Guardrails (Claude Hooks)

A comprehensive set of hooks under `.claude/hooks/` enforces security and governance controls at the agent runtime layer:

- `.claude/hooks/protect-env.sh` — prevents secret inlining
- `.claude/hooks/protect-git-push.sh` — guards branch push rules
- `.claude/hooks/protect-prod.sh` — blocks unauthorized production changes
- `.claude/hooks/protect-destructive.sh` — intercepts destructive operations
- `.claude/hooks/security-scan.sh` — inline security scanning on agent actions
- `.claude/hooks/audit-log.sh` — maintains an operation audit trail
- `.claude/hooks/cost-tracker.sh` — monitors cloud cost changes
- `.claude/hooks/auto-draft-pr.sh` — ensures changes surface as reviewable PRs
- `.claude/hooks/notify-email.sh` — alerting for notable events

Hook configuration is declared in `.claude/settings.json` and `.claude/settings.local.json`.

---

## Input Validation and Rate Limiting

The Node.js/Express.js backend (`src/index.js`, `src/api/`) applies rate limiting and input validation middleware, as documented in `README.md:26-27`. Rate limiting behavior is exercised by a dedicated test suite at `tests/rate-limit.test.js`. This provides a defense-in-depth layer against abuse and malformed input reaching the quantum simulation engine.

---

## Infrastructure Security

Terraform-managed infrastructure (`terraform/main.tf`, `terraform/backend.tf`, `terraform/variables.tf`, `terraform/versions.tf`) uses remote state with a dedicated bootstrap phase (`terraform/bootstrap/`) for state bucket and IAM provisioning. Provider version constraints are pinned in `terraform/versions.tf`, reducing supply-chain risk from unexpected provider upgrades. Example variable values are provided in `terraform.tfvars.example` without real credentials.

The `.github/workflows/destroy.yml` workflow exists for infrastructure teardown, which represents a high-risk operation; its presence as a named, auditable workflow (rather than ad-hoc CLI execution) is a governance positive, though access controls on this workflow are not verifiable from the readings provided.

---

## Dependency Management

Python backend dependencies are declared in `backend/requirements.txt` and `frontend/backend/requirements.txt`. Frontend dependencies are declared in `frontend/package.json` and the root `package.json`. A `DEPENDENCY_AUDIT.md` file exists at the repository root, indicating that dependency auditing is a documented practice. ESLint is configured at `.eslintrc.json` and `frontend/eslint.config.js` for static analysis of JavaScript/TypeScript code.

---

## Identified Gaps and Risks

| Area | Observation | Risk |
|---|---|---|
| Dependency pinning | No lock-file pinning verification in CI is visible from the readings; `backend/requirements.txt` format is not confirmed to use exact pins | Supply-chain drift |
| Destroy workflow access | `.github/workflows/destroy.yml` exists but its access controls (environment protection rules, required reviewers) are not verifiable from the readings | Accidental or unauthorized infrastructure teardown |
| Frontend/backend stub | A co-located backend at `frontend/backend/` with its own `frontend/backend/requirements.txt` exists; its security posture (auth, validation) is not documented in the readings | Unknown attack surface if exposed |
| Test coverage scope | Python backend tests are under `backend/tests/` and a standalone `test_ttt.py` exists at root; coverage extent is not verifiable from the readings | Security-relevant paths may be untested |
| Supabase schema | `supabase_schema.sql` is the single source of truth for the database schema; no migration tooling or schema drift detection is visible | Schema drift, potential for unreviewed schema changes |

---

## Summary

Quantumanic demonstrates a solid foundational security posture: secrets are managed by reference and never inlined (`.env.example`, `.claude/hooks/protect-env.sh`), CI enforces secret scanning (`.github/workflows/secret-scan.yml`, `.gitleaks.toml`), branch protection and PR-gating are enforced by both hooks and workflows (`.claude/hooks/protect-git-push.sh`, `.github/workflows/auto-pr.yml`, `.github/workflows/claude-review.yml`), and runtime guardrails cover production protection, destructive-operation interception, and audit logging (`.claude/hooks/`). The primary open risks are around the destroy workflow's access controls, the security posture of the `frontend/backend/` stub, and the verifiability of dependency pinning and test coverage depth.

# Hot spots

**Dual-backend complexity** — The project explicitly adopts a dual-backend strategy (`ARCHITECTURE.md`, `README.md:14-15`) with two separate runtimes: a Node.js/Express.js layer (`src/index.js`, `src/api/`, `src/quantum/`) and a Python/FastAPI layer (`backend/main.py`, `backend/run.py`, `backend/quantum/`). This split creates two parallel quantum simulation paths — one in Node.js (`src/quantum/`) and one in Python (`backend/quantum/`) — whose behavioral parity is not guaranteed by any visible cross-runtime integration test. The `tests/simulator.test.js` covers the Node.js path and `backend/tests/` covers the Python path, but no test file bridges both.

**Co-located frontend backend stub** — A third backend surface exists at `frontend/backend/` with its own dependency file (`frontend/backend/requirements.txt`). Its role (dev proxy, stub, or production component) is not documented in the directory tree or README, making it an ambiguous and potentially unreviewed attack surface.

**Single-commit history** — The repo readings show only one recent commit (`ac8b84c feat: add task tracking and sprint planning documentation (#30)`), and all high-churn files show exactly 1 touch each (`.claude/hooks/audit-log.sh`, `.claude/hooks/protect-env.sh`, `.github/workflows/auto-pr.yml`, etc.). This suggests the repository was either recently initialized or rebased, making it impossible to identify genuine churn-based hot spots from historical data. The entire `.claude/hooks/` directory and all six CI workflows were introduced in a single wave, meaning none have been battle-tested through iterative change.

**Standalone test script at root** — `test_ttt.py` exists at the repository root outside of any organized test directory (`backend/tests/`, `tests/`). Its scope, what it tests, and whether it is executed in CI are not verifiable from the readings, making it a maintenance liability.

**Supabase schema as sole migration artifact** — `supabase_schema.sql` is the single source of truth for the database schema with no ORM migration tooling or schema drift detection visible in the directory tree. Any schema change requires manual coordination with no automated rollback path.

---

# Tech-debt register

| ID | Description | Location | Severity |
|---|---|---|---|
| TD-01 | **Dual quantum simulation paths** — Quantum gate logic is implemented in both `src/quantum/` (Node.js/mathjs) and `backend/quantum/` (Python). The README acknowledges the Express.js heritage (`README.md:13`) and notes the dual-backend as a deliberate but transitional choice (`README.md:14-15`). Without a canonical owner, the two implementations will diverge silently. | `src/quantum/`, `backend/quantum/` | High |
| TD-02 | **Undocumented frontend/backend stub** — `frontend/backend/` with `frontend/backend/requirements.txt` has no documented purpose, ownership, or security posture. It may be a leftover dev artifact or an active proxy; neither case is documented. | `frontend/backend/`, `frontend/backend/requirements.txt` | High |
| TD-03 | **No database migration tooling** — `supabase_schema.sql` is the sole schema artifact. There is no Alembic, Flyway, or equivalent migration chain. Schema changes cannot be applied incrementally, rolled back, or audited through standard tooling. | `supabase_schema.sql` | High |
| TD-04 | **Root-level test script outside CI** — `test_ttt.py` at the repository root is outside the organized test directories and its CI integration is not verifiable from the readings. It may represent dead or orphaned test code. | `test_ttt.py` | Medium |
| TD-05 | **Dependency pinning not confirmed** — `backend/requirements.txt` and `frontend/backend/requirements.txt` exist but their pinning discipline (exact versions vs. ranges) is not verifiable. No lock-file verification step is visible in CI workflows (`.github/workflows/deploy.yml`, `.github/workflows/bootstrap.yml`). | `backend/requirements.txt`, `frontend/backend/requirements.txt` | Medium |
| TD-06 | **Destroy workflow access controls unverifiable** — `.github/workflows/destroy.yml` exists as a named workflow for infrastructure teardown, but whether it is gated by environment protection rules or required reviewers cannot be determined from the readings. An unprotected destroy workflow is a high-risk operational gap. | `.github/workflows/destroy.yml` | Medium |
| TD-07 | **Duplicate ESLint configurations** — ESLint is configured at both `.eslintrc.json` (root, legacy format) and `frontend/eslint.config.js` (frontend, flat config format). These two configurations may produce inconsistent linting behavior across the Node.js and frontend codebases. | `.eslintrc.json`, `frontend/eslint.config.js` | Low |
| TD-08 | **Multiple tsconfig files without clear hierarchy** — The frontend uses three TypeScript configuration files (`frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`) whose inheritance and override relationships are not documented. | `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json` | Low |
| TD-09 | **PDF and text data files in repository** — `cbs-sports-2026-bracket.pdf` and `ncaainfo.txt` are committed to the repository root. Their relationship to the quantum simulation platform is not documented and they inflate repository size unnecessarily. | `cbs-sports-2026-bracket.pdf`, `ncaainfo.txt` | Low |

---

# Recent incidents (last 90d)

No incidents can be confirmed from the repository readings. The commit history provided contains only a single entry (`ac8b84c feat: add task tracking and sprint planning documentation (#30)`), and no incident reports, post-mortems, hotfix commits, or revert commits are visible. The `LESSONS_LEARNED.md` file exists at the repository root, which may contain retrospective incident data, but its contents are not included in the repo readings and no claims can be made about it.

The high-churn file list shows every file with exactly 1 touch, consistent with a repository that was either recently bootstrapped or had its history compacted. No file shows the repeated-touch pattern (e.g., 5–20 touches) that would indicate a hot incident response cycle.

**Conclusion:** No incidents can be documented for the last 90 days from the available source material.

---

# Open questions for operator

1. **Dual-backend ownership decision** — The README explicitly flags the dual-backend architecture as requiring clarification (`README.md:14-15`, `ARCHITECTURE.md`). Which runtime — Node.js/Express.js or Python/FastAPI — is the canonical production backend for quantum simulation? The parallel `src/quantum/` and `backend/quantum/` implementations need a designated owner and a deprecation plan for the other. This is a prerequisite for any performance or correctness benchmarking.

2. **`frontend/backend/` purpose and lifecycle** — What is `frontend/backend/` with its own `frontend/backend/requirements.txt`? Is it a development proxy, a production component, or an artifact to be deleted? If it is exposed in any environment, what authentication and input validation does it apply?

3. **Database migration strategy** — `supabase_schema.sql` is the sole schema artifact with no migration tooling visible. How are schema changes applied to production? Who has write access to the Supabase project, and is there a change-approval process for schema modifications?

4. **Destroy workflow access controls** — `.github/workflows/destroy.yml` can tear down all cloud infrastructure. What environment protection rules, required reviewers, or approval gates are configured on this workflow in GitHub? This cannot be determined from the repository files alone and requires operator confirmation.

5. **`test_ttt.py` scope and CI integration** — What does `test_ttt.py` test, and is it executed in any CI pipeline? If it is not wired into CI, it should either be integrated or removed to avoid false confidence in test coverage.

6. **`cbs-sports-2026-bracket.pdf` and `ncaainfo.txt` relevance** — These files (`cbs-sports-2026-bracket.pdf`, `ncaainfo.txt`) are committed to the repository root. Are they inputs to a sports-analytics feature, sample data for a demo, or accidental commits? If they are not part of the product, they should be removed and the history cleaned.

7. **Dependency pinning policy** — Is there a policy requiring exact version pins in `backend/requirements.txt` and `frontend/backend/requirements.txt`? Is dependency pinning verified in CI (e.g., `pip install --require-hashes`)? The `DEPENDENCY_AUDIT.md` file exists but its contents and enforcement status are not available in the readings.

8. **`LESSONS_LEARNED.md` contents** — This file exists at the repository root but its contents were not included in the readings. Does it document past incidents, architectural mistakes, or operational failures that should inform the current tech-debt register or risk assessment?
