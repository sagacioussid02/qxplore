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

Leave all values in `.env` as the placeholder strings (`sk-ant-your-key-here`, etc.). The backend will log warnings for missing keys but will still start. Quantum circuit endpoints work without any external services.

---

## Getting Started Locally

### Prerequisites

- Node.js 16+ and npm
- Git

### Clone and Install

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

### Run Locally

**Backend:**
```bash
cd backend
npm start
```

API available at `http://localhost:3000`

**Frontend (new terminal):**
```bash
cd frontend
npm run dev
```

UI available at `http://localhost:5173`

### Run Tests

**Backend:**
```bash
cd backend
npm test
```

**Frontend:**
```bash
cd frontend
npm test
```

### Linting

**Backend:**
```bash
cd backend
npm run lint          # Check
npm run lint:fix      # Auto-fix
```

**Frontend:**
```bash
cd frontend
npm run lint          # Check
npm run lint:fix      # Auto-fix
```

---

## Project Structure

```
quantumanic/
├── backend/                    # Express.js API service
│   ├── src/
│   │   ├── index.js           # App setup
│   │   ├── api/
│   │   │   └── routes.js      # Route handlers
│   │   └── quantum/
│   │       ├── simulator.js   # Circuit simulator
│   │       └── gates.js       # Gate definitions
│   ├── tests/                 # Jest tests
│   ├── package.json
│   └── README.md
├── frontend/                   # React UI
│   ├── src/
│   ├── package.json
│   └── README.md
├── docs/
│   └── adr/                   # Architecture Decision Records
├── ARCHITECTURE.md
├── CONTRIBUTING.md            # This file
├── TASKS.md                   # Task backlog
├── SPRINT_PLAN.md             # Sprint roadmap
└── README.md
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b minions/engineer/<short-summary>
```

**Branch naming:** `minions/<role>/<short-summary>`
- Example: `minions/engineer/implement-cnot-gate`
- Example: `minions/engineer/enhance-circuit-builder`

### 2. Make Your Changes

- Write code following the coding standards (see below)
- Add or update tests
- Update documentation as needed

### 3. Run Tests and Linting

```bash
# Backend
cd backend
npm test
npm run lint:fix

# Frontend
cd frontend
npm test
npm run lint:fix
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: implement CNOT gate support"
```

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `test:` for tests
- `refactor:` for code refactoring

### 5. Push and Open a PR

```bash
git push origin minions/engineer/<short-summary>
```

Open a pull request on GitHub targeting `main`. See [Submitting a Pull Request](#submitting-a-pull-request) below.

---

## Task Assignment and Sprint Participation

### For New Engineers

1. **Review TASKS.md** — Familiarize yourself with the unassigned tasks and their acceptance criteria
2. **Pick a Task** — Start with a high-priority, well-scoped task (e.g., Task 1: CNOT Gate or Task 4: Frontend UI)
3. **Create an Issue** — Link your task to a GitHub issue for tracking
4. **Update SPRINT_PLAN.md** — Add your name to the task assignment table
5. **Implement** — Follow the development workflow above
6. **Submit PR** — Reference the task and issue in your PR description

### Sprint Participation

- **Planning:** Attend Monday 10:00 AM planning meeting (or async update)
- **Daily Standup:** Post async updates in #quantumanic-standup
- **Review & Retro:** Attend Friday 4:00 PM review and retrospective
- **Capacity:** Plan for ~7 points per engineer per sprint (2-week cycle)

### Definition of Done

A task is complete when:
- ✅ All acceptance criteria met
- ✅ Peer review approved
- ✅ Unit tests pass (>80% coverage)
- ✅ CI pipeline passes
- ✅ Documentation updated
- ✅ PR merged to main

---

## Submitting a Pull Request

### PR Title

Use [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: implement CNOT gate support
fix: correct rate limit calculation
docs: clarify quantum gate definitions
```

### PR Description

Include:
1. **Context** — What problem does this solve?
2. **Changes** — What did you change and why?
3. **Testing** — How did you test this?
4. **Related Issues** — Link to GitHub issues or tasks

**Example:**
```markdown
## Context
Task 1: Implement CNOT gate support for multi-qubit circuits.

## Changes
- Added CNOT gate logic to `backend/src/quantum/gates.js`
- Implemented control and target qubit validation
- Added API support for CNOT in `/api/circuit/run`

## Testing
- Unit tests for CNOT with various qubit indices
- Integration tests with other gates
- Manual testing via circuit builder UI

## Related Issues
Closes #42 (Task 1: Implement CNOT Gate)
```

### Review Process

1. **Peer Review** — A team member reviews your code
2. **CI Pipeline** — Automated tests, linting, and build checks
3. **Operator Approval** — For material decisions (see Hard Rules in CONTRIBUTING.md)
4. **Merge** — Once approved, your PR is merged to main

**Note:** Do not merge your own PRs. Wait for peer approval.

---

## Coding Standards

### JavaScript/Node.js

- Use ESLint configuration in `backend/.eslintrc.json`
- Indent with 2 spaces
- Use `const` by default; `let` for reassignment; avoid `var`
- Use arrow functions for callbacks
- Add JSDoc comments for public functions

**Example:**
```javascript
/**
 * Apply a quantum gate to a circuit.
 * @param {Array} state - Current state vector
 * @param {string} gate - Gate name (e.g., 'X', 'H', 'CNOT')
 * @param {Array} qubits - Target qubit indices
 * @returns {Array} New state vector
 */
function applyGate(state, gate, qubits) {
  // Implementation
}
```

### React/TypeScript (Frontend)

- Use functional components with hooks
- Use TypeScript for type safety
- Add prop types or interfaces
- Use descriptive component names

**Example:**
```typescript
interface CircuitBuilderProps {
  onRun: (circuit: Circuit) => void;
  gates: Gate[];
}

const CircuitBuilder: React.FC<CircuitBuilderProps> = ({ onRun, gates }) => {
  // Implementation
};
```

### Tests

- Use Jest for unit tests
- Aim for >80% code coverage
- Test happy paths and edge cases
- Use descriptive test names

**Example:**
```javascript
describe('CNOT Gate', () => {
  it('should apply X to target qubit when control is |1⟩', () => {
    const state = [0, 1, 0, 0]; // |01⟩
    const result = applyCNOT(state, 0, 1);
    expect(result).toEqual([0, 0, 1, 0]); // |10⟩
  });
});
```

---

## Running Tests

### Backend Tests

```bash
cd backend
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- --watch        # Watch mode
```

### Frontend Tests

```bash
cd frontend
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
npm test -- --watch        # Watch mode
```

### Coverage Requirements

- Statements: >80%
- Branches: >75%
- Functions: >80%
- Lines: >80%

---

## Questions and Help

- **Slack:** #quantumanic (general questions)
- **GitHub Issues:** For bugs and feature requests
- **Weekly Sync:** Friday 4:00 PM (team meeting)
- **Pair Programming:** Ask for help in Slack; we encourage collaboration

---

## Additional Resources

- [ARCHITECTURE.md](ARCHITECTURE.md) — System design and deployment
- [TASKS.md](TASKS.md) — Task backlog and acceptance criteria
- [SPRINT_PLAN.md](SPRINT_PLAN.md) — Sprint roadmap and team capacity
- [README.md](README.md) — Project overview and quick start
- [Conventional Commits](https://www.conventionalcommits.org/) — Commit message format
- [Jest Documentation](https://jestjs.io/) — Testing framework
- [ESLint Documentation](https://eslint.org/) — Linting tool

---

Happy coding! 🚀
