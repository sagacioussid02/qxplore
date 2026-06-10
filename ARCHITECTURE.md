# Quantumanic Architecture

## Overview

Quantumanic is a quantum computing simulator and API service. The project consists of:

1. **Frontend** — Web-based user interface (JavaScript/Node.js)
2. **Backend** — Quantum circuit API service (Express.js + Python simulation engine)

## Directory Structure

```
quantumanic/
├── backend/                    # Primary API service
│   ├── requirements.txt        # Python dependencies (AUTHORITATIVE PATH — see PE-2 audit note below)
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
│   │   └── requirements.txt   # Python dependencies (DUPLICATE — see PE-2 audit note below)
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

**Technology:** Express.js (Node.js) + Python simulation engine (numpy/scipy)

**Responsibilities:**
- Quantum circuit simulation
- RESTful API for circuit execution
- Rate limiting and security controls
- Input validation
- Express-to-Python routing layer

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

**Note on duplicate requirements.txt:** A known active bug (PE-2 in sprint plan) exists where `backend/requirements.txt` and `frontend/backend/requirements.txt` can diverge, causing security patches applied to one file to not ship via the other. The sprint plan tasks `cloud_devops` with auditing which file is authoritative and consolidating before the next deployment. Until PE-2 is resolved, deploy.yml targets `backend/requirements.txt` as the authoritative path.

## Deployment

### Development

```bash
# Install dependencies
cd backend
npm install
pip install -r requirements.txt

# Start the server
npm start
```

The API will be available at `http://localhost:3000`.

### Production

Deploy the `backend/` service to your cloud platform. Ensure:
- Environment variables are properly configured (see `backend/.env.example`)
- Python dependencies are installed from `backend/requirements.txt` (authoritative path per PE-2 audit)
- Rate limiting is enabled
- Health checks are configured
- Logs are collected and monitored
- Express-to-Python routing layer returns proper HTTP error codes (4xx/5xx) on failures, not silent 200 responses

## Security

### Rate Limiting

- General `/api` routes: 100 requests per 15 minutes per IP
- `POST /api/circuit/run`: 10 requests per 15 minutes per IP

### Input Validation

All circuit parameters and gate definitions are validated before execution.

### Dependency Management

Both `backend/requirements.txt` and `frontend/backend/requirements.txt` should be regularly audited for security vulnerabilities. See the sprint plan (PE-2 task) for dependency audit and consolidation procedures. Until consolidation is complete, deploy.yml targets `backend/requirements.txt` as the authoritative source.

## Development Workflow

1. Create a feature branch: `minions/<role>/<short-summary>`
2. Make changes and test locally
3. Push to the branch and open a PR targeting `main`
4. Address peer review feedback
5. Merge after approval and CI passes
