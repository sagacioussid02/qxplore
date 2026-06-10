# Contributing to Quantumanic

Thank you for your interest in contributing! Quantumanic is a quantum computing simulator and API service. This guide covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [What You Can Contribute](#what-you-can-contribute)
- [Environment Variables and Secrets Policy](#environment-variables-and-secrets-policy)
- [Getting Started Locally](#getting-started-locally)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Running Tests](#running-tests)
- [Linting](#linting)
- [Task Assignment and Sprint Participation](#task-assignment-and-sprint-participation)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Standards](#coding-standards)
- [Questions and Help](#questions-and-help)

---

## Code of Conduct

Be respectful, constructive, and welcoming. We follow the standard [Contributor Covenant](https://www.contributor-covenant.org/). Harassment, gatekeeping, or dismissive behavior will not be tolerated.

---

## What You Can Contribute

- **Bug fixes** — open an issue first if the bug is non-trivial
- **New quantum gates and circuit mechanics** — see TASKS.md for planned gates
- **Frontend UI/UX improvements** — animations, accessibility, responsiveness
- **Documentation** — explanations of quantum concepts, inline code comments
- **Tests** — the test coverage is thin; adding Jest tests is very welcome
- **Performance improvements** — especially in circuit simulation

If you are planning a large change, please open an issue to discuss it before writing code. This avoids duplicate effort and misaligned expectations.

---

## Environment Variables and Secrets Policy

**Never commit `.env` files or real secrets to the repository.**

### What requires real keys (maintainers only)

| Service | Purpose | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude AI agents | Future AI features |
| `OPENAI_API_KEY` | GPT-4o | Future AI features |
| `GOOGLE_API_KEY` | Gemini | Future AI features |

### What contributors need (nothing secret)

Most contributions only touch:
- **Frontend UI** — no backend keys needed; run `npm run dev` and mock the API
- **Quantum simulation** — circuit simulation runs locally with no API keys
- **Backend logic** — the Express.js app starts cleanly with missing keys (services degrade gracefully)

### Setup for local development

```bash
cp .env.example .env
```

Leave all values in `.env` as the placeholder strings. The app will work fine without real credentials for local development.

---

## Getting Started Locally

### Prerequisites

- **Node.js 14+** and **npm**
- **Git**

### Installation

```bash
git clone <repository-url>
cd quantumanic

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies (in a new terminal)
cd frontend
npm install
```

### Configuration

**Backend:**
```bash
cd backend
cp .env.example .env
```

Key environment variables:
- `PORT` — Server port (default: 3000)
- `RATE_LIMIT_WINDOW_MS` — Rate limit window in milliseconds (default: 900000 = 15 min)
- `RATE_LIMIT_MAX_REQUESTS` — Max requests per IP for general /api routes (default: 100)
- `CIRCUIT_RUN_RATE_LIMIT` — Max requests per IP for POST /api/circuit/run (default: 10)

**Frontend:**
```bash
cd frontend
cp .env.example .env
```

Key environment variables:
- `VITE_API_URL` — Backend API URL (default: http://localhost:3000)

---

## Project Structure

```
quantumanic/
├── backend/                    # Express.js API service
│   ├── src/
│   │   ├── index.js           # App entry point
│   │   ├── api/
│   │   │   └── routes.js      # API routes
│   │   └── quantum/
│   │       ├── simulator.js   # Quantum circuit simulator
│   │       └── gates.js       # Gate definitions
│   ├── tests/                 # Jest test suite
│   ├── package.json
│   └── README.md
├── frontend/                   # React/TypeScript UI
│   ├── src/
│   ├── tests/                 # Jest test suite
│   ├── package.json
│   └── README.md
├── docs/                       # Documentation
├── ARCHITECTURE.md
├── CONTRIBUTING.md             # This file
├── README.md
└── package.json
```

---

## Development Workflow

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b minions/<role>/<short-summary>
   ```
   Example: `minions/engineer/add-toffoli-gate`

2. **Make your changes** and commit with clear messages:
   ```bash
   git commit -m "feat: add Toffoli gate support"
   ```

3. **Run tests and linting** locally (see sections below).

4. **Push your branch** and open a pull request:
   ```bash
   git push origin minions/<role>/<short-summary>
   ```

5. **Request review** from the team. At least one peer review is required before merge.

6. **Address feedback** and push updates to the same branch.

7. **Merge** only after peer approval and CI passes.

---

## Running Tests

### Backend Tests

```bash
cd backend
npm test
```

This runs Jest on all test files in `backend/tests/`.

### Frontend Tests

```bash
cd frontend
npm test
```

This runs Jest on all test files in `frontend/tests/`.

### Watch Mode

To run tests in watch mode (re-run on file changes):

```bash
# Backend
cd backend
npm test -- --watch

# Frontend
cd frontend
npm test -- --watch
```

---

## Linting

### Run ESLint

```bash
cd backend
npm run lint
```

This checks code style and common errors in `src/` and `tests/`.

### Auto-fix Linting Issues

```bash
cd backend
npm run lint:fix
```

This automatically fixes many linting issues (indentation, semicolons, etc.).

---

## Task Assignment and Sprint Participation

All tasks are tracked in `TASKS.md`. Task assignments follow the policy in `TASK_ASSIGNMENT_POLICY.md`.

**Before starting work:**
1. Check `TASKS.md` for available tasks matching your role.
2. Assign yourself to a task (update the "Assigned To" field).
3. Update the task status as you progress ("In Progress" → "In Review" → "Done").
4. Link your PR to the task in the PR description.

**Example PR description:**
```
Closes TASK-001: Implement Toffoli Gate

## Summary
Adds support for the Toffoli (CCNOT) gate to the quantum simulator.
...
```

---

## Submitting a Pull Request

1. **Title:** Use conventional commit format:
   - `feat: add Toffoli gate`
   - `fix: correct CNOT matrix calculation`
   - `docs: update README with new gates`
   - `test: add integration tests for rate limiting`

2. **Description:** Include:
   - What problem does this solve?
   - How does it solve it?
   - Any breaking changes?
   - Link to related tasks (e.g., "Closes TASK-001")

3. **Tests:** Ensure all tests pass locally:
   ```bash
   npm test
   npm run lint
   ```

4. **Review:** Request review from at least one peer. Address all feedback before merge.

---

## Coding Standards

### JavaScript/TypeScript

- Use **ES6+** syntax (const/let, arrow functions, template literals)
- Follow **ESLint** rules (run `npm run lint` to check)
- Use **meaningful variable names** (avoid `x`, `y`, `tmp`)
- Add **JSDoc comments** for functions:
  ```javascript
  /**
   * Applies a quantum gate to a qubit.
   * @param {Array} state - The quantum state vector
   * @param {number} qubit - The target qubit index
   * @param {Array} gate - The gate matrix
   * @returns {Array} The new state vector
   */
  function applyGate(state, qubit, gate) {
    // ...
  }
  ```

### Tests

- Write tests for all new functions and API endpoints
- Use **descriptive test names**:
  ```javascript
  test('should apply Hadamard gate to qubit 0', () => {
    // ...
  });
  ```
- Aim for **>80% code coverage** on new code

### Commits

- Keep commits **small and focused** (one feature per commit)
- Use **clear commit messages**:
  - ✅ `feat: add Toffoli gate implementation`
  - ❌ `fix stuff` or `update code`

---

## Questions and Help

- **Questions about a task?** Comment on the task in `TASKS.md` or open a GitHub issue.
- **Need help setting up?** Check `README.md` or ask in the project discussions.
- **Found a bug?** Open an issue with a clear description and steps to reproduce.
- **Have a feature idea?** Open an issue to discuss before implementing.

Thank you for contributing!
