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
- [Task Assignment and Sprint Participation](#task-assignment-and-sprint-participation)
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

Leave all values in `.env` as the placeholder strings (`sk-ant-your-key-here`, etc.). The app will work fine without them.

**Never commit `.env` files or real secrets to the repository.**

---

## Getting Started Locally

### Prerequisites

- **Node.js** 16+ and npm
- **Python** 3.8+ (for backend quantum simulation)
- **Git**

### Clone and Install

```bash
git clone https://github.com/your-org/quantumanic.git
cd quantumanic

# Backend
cd backend
npm install

# Frontend (in a new terminal)
cd frontend
npm install
```

### Run Locally

```bash
# Terminal 1: Backend
cd backend
npm start
# API runs on http://localhost:3000

# Terminal 2: Frontend
cd frontend
npm run dev
# UI runs on http://localhost:5173
```

---

## Project Structure

```
quantumanic/
├── backend/                    # Express.js API service
│   ├── src/
│   │   ├── index.js           # App entry point
│   │   ├── api/
│   │   │   └── routes.js      # API endpoints
│   │   └── quantum/
│   │       ├── simulator.js   # Circuit simulator
│   │       └── gates.js       # Gate definitions
│   ├── tests/                 # Jest test suite
│   ├── package.json
│   └── README.md
├── frontend/                   # React/TypeScript UI
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── store/             # State management
│   │   └── App.tsx            # Root component
│   ├── tests/                 # Vitest test suite
│   ├── package.json
│   └── README.md
├── docs/
│   ├── adr/                   # Architecture Decision Records
│   └── GATES.md               # Gate documentation
├── TASKS.md                   # Task registry and assignments
├── TASK_ASSIGNMENT_POLICY.md  # Task workflow policy
├── ARCHITECTURE.md
├── CONTRIBUTING.md            # This file
└── README.md
```

---

## Development Workflow

### 1. Pick a Task

See [TASKS.md](TASKS.md) for the list of pending work. Tasks are prioritized and include acceptance criteria.

For detailed assignment workflow, see [TASK_ASSIGNMENT_POLICY.md](TASK_ASSIGNMENT_POLICY.md).

### 2. Create a Feature Branch

```bash
git checkout -b minions/engineer/<TASK-ID>-<short-title>
```

Example:
```bash
git checkout -b minions/engineer/TASK-001-implement-toffoli-gate
```

### 3. Make Changes

- Follow the acceptance criteria in the task
- Write tests for new functionality
- Update documentation as needed
- Keep commits atomic and descriptive

### 4. Run Tests and Linting

```bash
# Backend
cd backend
npm test
npm run lint
npm run lint:fix  # Auto-fix linting issues

# Frontend
cd frontend
npm test
npm run lint
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: TASK-001 implement toffoli gate"
git push origin minions/engineer/TASK-001-implement-toffoli-gate
```

### 6. Open a Pull Request

- Title: `feat: TASK-001 implement toffoli gate`
- Description: Include context, changes, and testing approach
- Reference the task ID
- Link to any related issues

### 7. Code Review

- A peer engineer reviews your code first
- Address feedback in new commits
- Do not merge your own work
- Wait for operator approval before merge

---

## Task Assignment and Sprint Participation

### Claiming a Task

1. Review [TASKS.md](TASKS.md) and find an unassigned task
2. Check the acceptance criteria and effort estimate
3. Claim the task by creating a feature branch or commenting on the issue
4. Update TASKS.md with your name and assignment date

### Task Workflow

See [TASK_ASSIGNMENT_POLICY.md](TASK_ASSIGNMENT_POLICY.md) for:
- Full task lifecycle (Unassigned → Assigned → In Progress → Review → Done)
- Engineer responsibilities
- Communication and escalation procedures
- Examples of task assignment and PR submission

### Effort Estimates

Tasks include story point estimates (3, 5, 8 points). Use these as guidance:
- **3 points** — 1–2 hours of focused work
- **5 points** — 2–4 hours of work
- **8 points** — 1–2 days of work

If your actual effort differs significantly, notify the operator.

---

## Submitting a Pull Request

### PR Title

Use conventional commit format:
- `feat: <description>` — new feature
- `fix: <description>` — bug fix
- `docs: <description>` — documentation only
- `test: <description>` — tests only
- `refactor: <description>` — code refactoring

Example:
```
feat: TASK-001 implement toffoli gate
```

### PR Description

Include:
1. **Context** — What problem does this solve?
2. **Changes** — What did you change?
3. **Acceptance Criteria** — Which criteria are met?
4. **Testing** — How did you test this?
5. **Files** — What files were modified?

Template:
```markdown
## Task
TASK-001: Implement Toffoli Gate

## Context
The Toffoli gate is a fundamental three-qubit gate needed for quantum error correction.

## Changes
- Added Toffoli gate implementation in `backend/src/quantum/gates.js`
- Implemented three-qubit gate logic with matrix representation
- Added comprehensive unit tests

## Acceptance Criteria
- [x] Toffoli gate correctly applies to three qubits
- [x] Unit tests cover all input combinations
- [x] Documentation updated in gates.js
- [x] Integration test passes with circuit runner

## Testing
```bash
npm test
npm run lint
```
All tests pass. Coverage maintained at 85%.

## Files Changed
- `backend/src/quantum/gates.js`
- `backend/tests/gates.test.js`
```

### Checklist

Before submitting:
- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Acceptance criteria met
- [ ] Documentation updated
- [ ] No secrets or `.env` files committed
- [ ] Branch name follows convention
- [ ] PR title is descriptive

---

## Coding Standards

### JavaScript/TypeScript

- Use `const` by default, `let` if needed, avoid `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use async/await over promises
- Add JSDoc comments for public functions

Example:
```javascript
/**
 * Apply a quantum gate to a qubit.
 * @param {Array} state - Qubit state vector
 * @param {string} gate - Gate name (e.g., 'X', 'H')
 * @returns {Array} New state after gate application
 */
const applyGate = async (state, gate) => {
  const result = await simulator.apply(state, gate);
  return result;
};
```

### Python

- Follow PEP 8 style guide
- Use type hints for function signatures
- Use docstrings for modules and functions
- Use f-strings for formatting

### Testing

- Write tests for all new functionality
- Aim for 80%+ code coverage
- Use descriptive test names
- Test both happy path and error cases

Example:
```javascript
describe('Toffoli Gate', () => {
  it('should apply correctly to three qubits', () => {
    const state = [1, 0, 0, 0, 0, 0, 0, 0];
    const result = applyToffoli(state, 0, 1, 2);
    expect(result).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('should throw on invalid qubit indices', () => {
    expect(() => applyToffoli([1, 0], 0, 1, 5)).toThrow();
  });
});
```

### Documentation

- Add comments for complex logic
- Update README.md if adding features
- Add inline examples for public APIs
- Link to relevant ADRs or issues

---

## Running Tests

### Backend

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- gates.test.js
```

### Frontend

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Linting

```bash
# Backend
cd backend
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues

# Frontend
cd frontend
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues
```

---

## Questions and Help

### Getting Help

1. **Check existing issues** — Your question may already be answered
2. **Read the docs** — See README.md, ARCHITECTURE.md, and FRONTEND.md
3. **Ask in PR comments** — Tag reviewers with specific questions
4. **Open an issue** — For bugs or feature requests
5. **Contact the operator** — For policy or process questions

### Reporting Bugs

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (Node version, OS, etc.)
- Screenshots or logs if applicable

### Suggesting Features

Include:
- Use case or problem statement
- Proposed solution
- Alternatives considered
- Potential impact on existing code

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).

Thank you for contributing to quantumanic! 🚀
