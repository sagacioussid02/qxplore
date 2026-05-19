# ADR 001: Multi-Language Architecture (Node.js + Python + React/TypeScript)

**Date:** 2025
**Status:** Accepted
**Context:** Quantumanic is a quantum computing simulator with a mixed-language architecture.

## Problem Statement

The project contains significant code in multiple languages:
- **Python** (44 files) — quantum simulation backends
- **TypeScript/TSX** (62 files combined) — React frontend and type-safe API client
- **JavaScript/Node.js** (Express backend, API routes, middleware)

The README documented only the Node.js/Express layer, creating confusion about the actual architecture and making it difficult for new contributors to understand the project structure.

## Decision

We maintain a **multi-language architecture** with three primary layers:

1. **Frontend:** React with TypeScript (TSX)
   - User-facing quantum circuit builder and visualization
   - Type-safe API client
   - Runs in the browser

2. **API Layer:** Node.js/Express
   - RESTful endpoints for circuit execution
   - Rate limiting and input validation
   - Middleware for security and logging
   - Depends on `mathjs` for matrix operations

3. **Backend Simulation:** Python
   - Advanced quantum simulation and algorithm implementations
   - Potential integration with Qiskit or other quantum libraries
   - Handles complex gate operations and state vector calculations

## Rationale

- **Python** is the lingua franca of quantum computing; most quantum libraries (Qiskit, Cirq, PyQuTiP) are Python-first.
- **Node.js/Express** provides a lightweight, fast API layer suitable for web services and rate limiting.
- **React/TypeScript** offers a modern, type-safe frontend with excellent developer experience and performance.
- This separation of concerns allows each layer to be optimized independently and scaled horizontally.

## Consequences

### Positive
- Leverages best-in-class tools for each domain (quantum computing, web API, frontend UI).
- Enables parallel development across frontend, API, and backend teams.
- Python backend can be upgraded or replaced independently of the API layer.
- Type safety in the frontend reduces bugs and improves IDE support.

### Negative
- Increased operational complexity (three runtimes to manage).
- Potential latency overhead from inter-process communication (Node.js ↔ Python).
- Requires developers to be familiar with multiple languages and ecosystems.
- Deployment and CI/CD must handle multiple build steps and test suites.

## Mitigation

- **CI/CD Automation:** Automated test workflows (DEBT-01) ensure regressions are caught early across all layers.
- **Clear Documentation:** This ADR and updated README guide contributors on the architecture.
- **Containerization:** Docker can isolate each layer, simplifying local development and production deployment.
- **API Contracts:** Well-defined REST API contracts decouple frontend and backend development.

## Future Considerations

- **Consolidation:** If operational complexity becomes a bottleneck, a future sprint may consolidate the Node.js and Python layers into a single backend (e.g., FastAPI or Nest.js).
- **Qiskit Integration:** The Python backend is positioned to integrate with Qiskit for access to real quantum hardware simulators.
- **Microservices:** As the project grows, the Python backend could be split into separate microservices (e.g., circuit optimizer, state vector simulator, hardware interface).
