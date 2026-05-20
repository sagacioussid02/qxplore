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

Deploy the `backend/` service to your cloud platform. Ensure:
- Environment variables are properly configured (see `backend/.env.example`)
- Rate limiting is enabled
- Health checks are configured
- Logs are collected and monitored

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
2. Make changes to the appropriate service
3. Run tests: `npm test` (backend) or `pytest` (if applicable)
4. Open a pull request targeting `main`
5. Address code review feedback
6. Merge after approval and CI passes

## Testing

### Backend Tests

```bash
cd backend
npm test
```

Tests cover:
- Quantum gate operations
- Circuit simulation
- Rate limiting
- API endpoints

## Future Considerations

1. **Dual-Backend Consolidation** — Clarify the purpose of `frontend/backend/` and consolidate if it is legacy or unused.
2. **Multi-Qubit Gates** — Extend the simulator to support CNOT and SWAP gates (out of scope for Sprint 0).
3. **Performance Optimization** — Profile and optimize the quantum simulator for larger circuits.
4. **Monitoring and Observability** — Add structured logging and metrics collection.

## References

- [README.md](README.md) — Project overview and quick start
- [CONTRIBUTING.md](CONTRIBUTING.md) — Contribution guidelines
- [ADR 0001: Dual-Backend Architecture](docs/adr/0001-dual-backend-architecture.md) — Architectural decision record
- [backend/README.md](backend/README.md) — Primary backend documentation
