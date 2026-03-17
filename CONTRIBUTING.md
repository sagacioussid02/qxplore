# Contributing to Quantum Expedition

Thank you for your interest in contributing! Quantum Expedition is an open-source quantum computing education platform built on real Qiskit circuits and AI agents. This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What You Can Contribute](#what-you-can-contribute)
- [Environment Variables and Secrets Policy](#environment-variables-and-secrets-policy)
- [Getting Started Locally](#getting-started-locally)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Standards](#coding-standards)
- [Running Tests](#running-tests)
- [Questions and Help](#questions-and-help)

---

## Code of Conduct

Be respectful, constructive, and welcoming. We follow the standard [Contributor Covenant](https://www.contributor-covenant.org/). Harassment, gatekeeping, or dismissive behavior will not be tolerated.

---

## What You Can Contribute

- **Bug fixes** — open an issue first if the bug is non-trivial
- **New quantum games or circuit mechanics** — Qiskit-backed ideas welcome
- **Frontend UI/UX improvements** — animations, accessibility, responsiveness
- **Documentation** — explanations of quantum concepts, inline code comments
- **Tests** — the test coverage is thin; adding pytest or Vitest tests is very welcome
- **Performance improvements** — especially in the bracket streaming pipeline

If you are planning a large change, please open an issue to discuss it before writing code. This avoids duplicate effort and misaligned expectations.

---

## Environment Variables and Secrets Policy

**Contributors never need real API keys to run or develop locally.** The project is designed so that core quantum mechanics (Qiskit simulations) and frontend UI work without any external services.

### What requires real keys (maintainers only)

| Service | Purpose | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude AI agents | AI game narration, bracket agents |
| `OPENAI_API_KEY` | GPT-4o bracket agent | Bracket challenge |
| `GOOGLE_API_KEY` | Gemini bracket agent | Bracket challenge |
| `SPORTTSDATAIO_API_KEY` | Live NCAA bracket data | March Madness live mode |
| `SUPABASE_URL` + keys | Auth + database | User accounts, saved sessions |
| `STRIPE_SECRET_KEY` + keys | Payments | Credit purchases |

### What contributors need (nothing secret)

Most contributions only touch:
- **Frontend UI** — no backend keys needed; run `npm run dev` and mock the API
- **Qiskit circuits** — quantum simulation runs locally with no API keys
- **Backend logic** — the FastAPI app starts cleanly with missing keys (services degrade gracefully)

### Setup for local development

```bash
cp .env.example .env
```

Leave all values in `.env` as the placeholder strings (`sk-ant-your-key-here`, etc.). The backend will log warnings for missing keys but will still start. Quantum circuit endpoints work fully. AI agent endpoints will return errors, which is expected when developing other parts of the app.

### Hard rules for contributors

1. **Never commit a `.env` file** — it is in `.gitignore` and must stay there
2. **Never hardcode API keys, tokens, or credentials** in source files
3. **Never add real keys to PR descriptions, comments, or commit messages**
4. **Never request or expect to receive production credentials** — maintainers will not share them
5. If you accidentally commit a secret, immediately open an issue marked `security` so the key can be rotated

The CI/CD pipeline uses GitHub Actions secrets scoped to specific environments. Contributors do not have access to those secrets and PRs from forks run in a restricted environment without them.

---

## Getting Started Locally

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.11+ | Frontend dev server |
| Python | 3.11+ | Backend |
| pip / venv | any | Python deps |
| Git | any | Version control |

You do **not** need Docker, Terraform, or AWS credentials to contribute.

### Clone and run

```bash
git clone https://github.com/<your-fork>/quantumanic.git
cd quantumanic

# Set up environment (no real keys needed)
cp .env.example .env

# Backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# Frontend
cd frontend
npm install
cd ..

# Start everything
chmod +x start.sh
./start.sh
```

The script starts the FastAPI backend on `http://localhost:8000` and the Vite frontend on `http://localhost:5173`.

To start them separately:

```bash
# Terminal 1 — backend
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

### Verify it works

- Open `http://localhost:5173`
- The Quantum Coin and Quantum Tic-Tac-Toe games should load and run (Qiskit works offline)
- AI-powered features (bracket agents, narration) will show errors — that is expected without real API keys

---

## Project Structure

```
quantumanic/
├── frontend/               # React + TypeScript + Vite
│   └── src/
│       ├── api/            # HTTP clients
│       ├── components/     # Reusable UI components
│       ├── hooks/          # Custom React hooks
│       ├── pages/          # Route-level pages
│       ├── store/          # Zustand state stores
│       └── types/          # Shared TypeScript types
│
├── backend/                # Python FastAPI
│   ├── main.py             # App entry point
│   ├── core/               # Settings, config
│   ├── routers/            # API endpoints
│   ├── agents/             # Claude AI agent base classes
│   ├── bracket/            # NCAA bracket engine + agents
│   ├── quantum/            # Qiskit circuit definitions
│   └── models/             # Pydantic data models
│
├── terraform/              # AWS infrastructure (maintainers only)
├── .github/workflows/      # CI/CD pipelines (maintainers only)
├── .env.example            # Environment template (safe to read)
└── start.sh                # Local dev launcher
```

---

## Development Workflow

1. **Fork** the repository on GitHub
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   # or
   git checkout -b fix/the-bug
   ```
3. **Make your changes** — keep commits focused and atomic
4. **Run lint and tests** (see below)
5. **Push** to your fork and open a Pull Request against `main`

Branch naming:
- `feat/` — new feature
- `fix/` — bug fix
- `docs/` — documentation only
- `refactor/` — internal code change, no behavior change
- `test/` — adding or fixing tests

---

## Submitting a Pull Request

### Before you open a PR

- [ ] The code runs locally without errors
- [ ] ESLint passes for frontend changes (`npm run lint` in `frontend/`)
- [ ] Python code follows the existing style (no new linter warnings)
- [ ] No secrets, keys, or credentials anywhere in the diff
- [ ] Commits have clear, descriptive messages

### PR description

Include:
- **What changed** — a short summary
- **Why** — motivation or link to an issue
- **How to test** — steps a reviewer can follow to verify the change
- **Screenshots** (for UI changes)

### Review process

- A maintainer will review within a few days
- Feedback will be left as PR comments — please address all comments or explain why you disagree
- Once approved, a maintainer will merge the PR
- Do not force-push to a PR branch after review has started

---

## Coding Standards

### Frontend (TypeScript + React)

- TypeScript strict mode is enabled — no `any` unless unavoidable and commented
- Components are functional with hooks; no class components
- Zustand for global state; local `useState` for component-only state
- Tailwind for styling; avoid inline `style` props except for dynamic values (colors, etc.)
- Framer Motion for animations — keep them subtle and purposeful
- File names: `PascalCase` for components, `camelCase` for hooks/utilities

### Backend (Python + FastAPI)

- Python 3.11+ style; use type hints everywhere
- Pydantic models for all request/response schemas
- FastAPI dependency injection for auth and settings
- Async endpoints where I/O is involved
- Keep route handlers thin; business logic belongs in dedicated modules
- Qiskit circuits go in `backend/quantum/`; AI agent logic in `backend/agents/` or `backend/bracket/agents/`

### General

- Keep pull requests small and focused — one concern per PR
- Do not mix refactors with feature changes
- Comments should explain *why*, not *what* — the code explains what

---

## Running Tests

### Backend

```bash
source venv/bin/activate
pytest backend/tests/ -v
```

The integration test for Quantum Tic-Tac-Toe requires a running backend:

```bash
# Start the backend first
uvicorn backend.main:app --port 8000

# Then in a second terminal
python test_ttt.py
```

### Frontend

```bash
cd frontend
npm run lint        # ESLint check
npm run build       # Type-check + production build
```

Vitest unit tests can be added under `frontend/src/__tests__/` — contributions to expand test coverage are very welcome.

---

## Questions and Help

- **Bug reports and feature requests** → open a [GitHub Issue](../../issues)
- **Questions about quantum mechanics in the code** → open a Discussion
- **Security issues** → open a private issue marked `security`; do not post publicly

We want contributing to feel approachable regardless of your background. If something in this guide is unclear or a setup step doesn't work, open an issue — that's a documentation bug worth fixing.
