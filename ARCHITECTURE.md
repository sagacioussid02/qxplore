# Quantumanic Architecture

## Overview

Quantumanic is a quantum computing simulator and API service. The project consists of:

1. **Frontend** — Web-based user interface (JavaScript/Node.js)
2. **Backend** — Quantum circuit API service (Express.js + mathjs)

## Directory Structure

```
quantumanic/
├── backend/                    # Primary API service
│   ├── requirements.txt        # Python dependencies (if applicable)
│   ├── src/
│   │   ├── index.js           # Express app setup
│   │   ├── api/
│   │   │   └── routes.js      # API route handlers
│   │   └── quantum/
│   │       ├── simulator.js   # Quantum circuit simulator
│   │       └── gates.js       # Quantum gate definitions
│   ├── tests/
│   ├── package.json
│   └── README.md
├── frontend/                   # Frontend application
│   ├── backend/               # Secondary backend (see ADR 0001)
│   │   └── requirements.txt   # Python dependencies
│   ├── src/
│   ├── package.json
│   └── README.md
├── docs/
│   └── adr/                   # Architecture Decision Records
│       └── 0001-dual-backend-architecture.md
├── ARCHITECTURE.md            # This file
├── CONTRIBUTING.md
├── README.md
└── package.json
```

## Services

### Primary Backend (`backend/`)

**Technology:** Express.js (Node.js) + mathjs

**Responsibilities:**
- Quantum circuit simulation
- RESTful API for circuit execution
- Rate limiting and security controls
- Input validation

**Key Endpoints:**
- `POST /api/circuit/run` — Execute a quantum circuit
- `GET /health` — Health check

**Supported Gates:**
- X (Pauli X / NOT gate)
- H (Hadamard gate)
- Z (Pauli Z gate)
- Y (Pauli Y gate)
- S (S gate / phase gate)
- T (T gate)

**Deployment:** This is the canonical backend service for production deployment.

### Secondary Backend (`frontend/backend/`)

**Status:** See [ADR 0001](docs/adr/0001-dual-backend-architecture.md) for clarification.

The purpose and deployment strategy for this backend should be documented in `frontend/backend/README.md`.

## Deployment Topology

The following diagram illustrates how the quantumanic services are organized and deployed:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION ENVIRONMENT                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  ROOT NPM DEPENDENCIES (Shared Tooling)                      │   │
│  │  ├─ Linting (ESLint)                                         │   │
│  │  ├─ Testing (Jest, React Testing Library)                   │   │
│  │  ├─ Build tooling (Vite)                                    │   │
│  │  └─ Shared utilities                                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND BUILD ARTIFACT (Vite Output)                       │   │
│  │  ├─ React 18+ TypeScript components                          │   │
│  │  ├─ Quantum circuit UI builder                               │   │
│  │  ├─ Static assets (HTML, CSS, JS bundles)                   │   │
│  │  └─ Served by Express.js static middleware                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  EXPRESS.JS SERVICE BOUNDARY (API Routing Layer)             │   │
│  │  ├─ HTTP server on port 3000 (configurable)                 │   │
│  │  ├─ Rate limiting middleware (100 req/15min general)         │   │
│  │  ├─ Circuit execution rate limit (10 req/15min)             │   │
│  │  ├─ Input validation and security controls                  │   │
│  │  ├─ Routes:                                                  │   │
│  │  │  ├─ POST /api/circuit/run → Python engine                │   │
│  │  │  ├─ GET /health → Service health check                   │   │
│  │  │  └─ Static files → Frontend build artifact               │   │
│  │  └─ Error handling and response formatting                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              │ HTTP/JSON                              │
│                              │ (Request validation)                   │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  PYTHON SERVICE BOUNDARY (Quantum Simulation Engine)         │   │
│  │  ├─ Quantum circuit simulator (mathjs-based)                 │   │
│  │  ├─ Gate implementations (X, H, Z, Y, S, T)                 │   │
│  │  ├─ Multi-qubit gate support (CNOT, SWAP, Toffoli)          │   │
│  │  ├─ Measurement and probability calculations                │   │
│  │  └─ Response formatting (JSON output)                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│                              │ JSON Response                          │
│                              │ (Circuit results)                      │
│                              ▼                                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND CLIENT (Browser)                                   │   │
│  │  ├─ Displays circuit results                                 │   │
│  │  ├─ Renders probability distributions                        │   │
│  │  └─ Provides circuit builder UI                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Service Communication Flow

1. **Frontend Build** → Root npm dependencies compile TypeScript and bundle React components via Vite
2. **Frontend Serving** → Express.js serves the built frontend artifacts as static files
3. **Circuit Execution** → Frontend sends `POST /api/circuit/run` to Express.js with circuit definition
4. **Request Validation** → Express.js validates input, applies rate limiting, and forwards to Python engine
5. **Simulation** → Python engine executes the quantum circuit and calculates measurement probabilities
6. **Response** → Python engine returns JSON results; Express.js formats and returns to frontend
7. **Display** → Frontend renders results in the UI

## Deployment

### Development

```bash
# Install dependencies
cd backend
npm install

# Start the server
npm start
```

The API will be available at `http://localhost:3000`.

### Production

Deploy the `backend/` service to your cloud platform. The deployment process:

1. **Build frontend artifacts** — Compile TypeScript and bundle React components
2. **Install backend dependencies** — Resolve npm packages for Express.js service
3. **Start Express.js service** — Listen on configured port (default 3000)
4. **Serve frontend** — Express.js static middleware serves built frontend to clients
5. **Route API requests** — Express.js forwards `/api/circuit/run` requests to Python engine
6. **Execute simulations** — Python engine processes quantum circuits
7. **Return results** — Express.js formats and returns JSON responses to frontend

Ensure:
- Environment variables are properly configured (see `backend/.env.example`)
- Rate limiting is enabled
- Health checks are configured
- Logs are collected and monitored
- Python service is accessible to Express.js (local or remote)

## Security

### Rate Limiting

- General `/api` routes: 100 requests per 15 minutes per IP
- `POST /api/circuit/run`: 10 requests per 15 minutes per IP

### Input Validation

All circuit parameters and gate definitions are validated before execution.

### Dependency Management

Both `backend/requirements.txt` and `frontend/backend/requirements.txt` should be regularly audited for security vulnerabilities. See the sprint plan for dependency audit procedures.

## Development Workflow

1. Create a feature branch: `minions/<role>/<short-summary>`
2. Make changes and test locally
3. Submit a pull request for peer review
4. After peer approval and CI passes, operator reviews and merges
5. Changes are deployed via `deploy.yml`

## References

- [ADR 0001: Dual-Backend Architecture](docs/adr/0001-dual-backend-architecture.md) — Decision rationale for backend structure
- [README.md](README.md) — Project overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines
