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

Leave all values in `.env` as the placeholder strings (`sk-ant-your-key-here`, etc.). The backend will log warnings for missing keys but will still start. Quantum circuit endpoints work without any keys.

---

## Getting Started Locally

### Prerequisites

- **Node.js 16+** (for frontend development)
- **Node.js 14+** (for backend development)
- **npm 7+**
- **Git**

### Clone the Repository

```bash
git clone <repository-url>
cd quantumanic
```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

   The API will be available at `http://localhost:3000`.

### Frontend Setup

1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   The default `VITE_API_URL=http://localhost:3000` should work if your backend is running locally.

4. Start the frontend development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`.

### Verify Setup

1. Open `http://localhost:5173` in your browser
2. The frontend should load without errors
3. Try building a simple circuit and executing it
4. If the backend is running, you should see results

For detailed frontend setup instructions, see [FRONTEND.md](FRONTEND.md).

---

## Project Structure

```
quantumanic/
├── backend/                    # Express.js API service
│   ├── src/
│   │   ├── index.js           # App entry point
│   │   ├── api/               # API routes
│   │   └── quantum/           # Quantum simulation logic
│   ├── tests/                 # Backend tests
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── frontend/                   # React/TypeScript UI
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API client
│   │   ├── types/             # TypeScript definitions
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── tests/                 # Frontend tests
│   ├── package.json
│   ├── .env.example
│   ├── vite.config.ts
│   └── README.md
├── docs/                       # Documentation
│   └── adr/                   # Architecture Decision Records
├── ARCHITECTURE.md            # System architecture
├── CONTRIBUTING.md            # This file
├── FRONTEND.md                # Frontend documentation
├── README.md                  # Main README
└── package.json               # Root package.json
```

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Development Workflow

### Branching Strategy

All feature branches follow the naming convention:
```
minions/<role>/<short-summary>
```

Examples:
- `minions/engineer/add-cnot-gate`
- `minions/documentation_engineer/fix-readme-tech-stack`
- `minions/cloud_devops/add-health-endpoint`

### Creating a Feature Branch

1. Ensure you're on the main branch:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a new feature branch:
   ```bash
   git checkout -b minions/<role>/<short-summary>
   ```

3. Make your changes

4. Commit with clear, descriptive messages:
   ```bash
   git commit -m "feat: add CNOT gate support"
   ```

   Use conventional commit prefixes:
   - `feat:` — New feature
   - `fix:` — Bug fix
   - `docs:` — Documentation
   - `test:` — Test additions or changes
   - `chore:` — Build, dependencies, tooling
   - `refactor:` — Code refactoring without feature changes

5. Push your branch:
   ```bash
   git push origin minions/<role>/<short-summary>
   ```

### Running Tests

**Backend tests:**
```bash
cd backend
npm test
```

**Frontend tests:**
```bash
cd frontend
npm test
```

**All tests:**
```bash
cd backend && npm test && cd ../frontend && npm test
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

## Submitting a Pull Request

1. **Push your branch** to the repository

2. **Open a pull request** on GitHub:
   - Target: `main` branch
   - Title: Use conventional commit format (e.g., "feat: add CNOT gate support")
   - Description: Include context, what changed, and how to test

3. **Ensure CI passes:**
   - All tests must pass
   - Linting must pass
   - No security issues detected

4. **Request review** from at least one peer

5. **Address feedback** — make requested changes and push updates

6. **Merge** — once approved and CI is green, a maintainer will merge your PR

### PR Description Template

```markdown
## Description
Brief description of what this PR does.

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Checklist
- [ ] Tests pass locally
- [ ] Linting passes
- [ ] Documentation updated (if applicable)
- [ ] No breaking changes
```

---

## Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint rules (run `npm run lint:fix` to auto-fix)
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused

### Commits

- Use conventional commit format
- Keep commits atomic (one logical change per commit)
- Write clear, descriptive commit messages
- Reference issues in commit messages when applicable (e.g., "Fixes #123")

### Testing

- Write tests for new features
- Maintain or improve code coverage
- Test edge cases and error conditions
- Use descriptive test names

---

## Running Tests

### Backend

```bash
cd backend
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

### Frontend

```bash
cd frontend
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # Coverage report
```

---

## Questions and Help

- **GitHub Issues** — For bugs, feature requests, and discussions
- **Discussions** — For general questions and ideas
- **Email** — Contact the maintainers directly

Don't hesitate to ask questions — we're here to help!

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
