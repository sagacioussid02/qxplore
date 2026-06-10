# Quantumanic Architecture

## Overview

Quantumanic is a quantum computing simulator and API service. The project consists of:

1. **Frontend** — Web-based user interface (JavaScript/Node.js)
2. **Backend** — Quantum circuit API service (Express.js + Python simulation engine)

## Directory Structure

```
quantumanic/
├── backend/                    # Primary API service
│   ├── requirements.txt        # Python dependencies
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

**Technology:** Express.js (Node.js) + Python simulation engine

**Responsibilities:**
- RESTful API routing and request validation
- Rate limiting and security controls
- Forwarding circuit execution requests to Python engine
- Response formatting and error handling

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

### Python Simulation Engine

**Technology:** Python with numpy/scipy for matrix operations

**Responsibilities:**
- Quantum circuit simulation
- Gate matrix computation and application
- Measurement and probability calculations
- State vector management

**Integration:** Runs as a separate service; Express.js routes circuit execution requests to this engine via HTTP or IPC.

### Secondary Backend (`frontend/backend/`)

**Status:** See [ADR 0001](docs/adr/0001-dual-backend-architecture.md) for clarification.

The purpose and deployment strategy for this backend should be documented in `frontend/backend/README.md`.

## Deployment

### Development

```bash
# Install backend dependencies
cd backend
npm install
pip install -r requirements.txt

# Start the Express server
npm start

# In another terminal, start the Python engine
python -m quantum_engine
```

The API will be available at `http://localhost:3000`.

### Production

Deploy both the Express.js service and Python simulation engine to your cloud platform. Ensure:
- Environment variables are properly configured (see `backend/.env.example`)
- Rate limiting is enabled
- Health checks are configured for both services
- Logs are collected and monitored
- GitHub Environment protection rules are enforced for deployments

## Security

### Rate Limiting

- General `/api` routes: 100 requests per 15 minutes per IP
- `POST /api/circuit/run`: 10 requests per 15 minutes per IP

### Input Validation

All circuit parameters and gate definitions are validated before execution. The Express layer validates request format; the Python engine validates circuit semantics.

### Dependency Management

Both `backend/requirements.txt` and `frontend/backend/requirements.txt` should be regularly audited for security vulnerabilities. See the sprint plan for dependency audit procedures.

## Development Workflow

1. Create a feature branch: `minions/<role>/<short-summary>`
2. Make changes
3. Test locally
4. Open a PR targeting `main`
5. Address review feedback
6. Merge after approval and CI passes
