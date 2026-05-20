# ADR 0001: Dual-Backend Architecture

**Status:** Accepted

**Date:** 2024

## Context

The quantumanic project contains two separate backend directories:
- `backend/` — The primary Express.js-based quantum circuit API service
- `frontend/backend/` — A secondary backend directory within the frontend structure

Each directory has its own `requirements.txt` file, creating architectural ambiguity about:
- Which backend is the canonical service?
- What is the purpose of each backend?
- How should they be deployed and maintained?
- Which should be audited for security vulnerabilities?

This ambiguity creates maintenance burden, deployment confusion, and an expanded security surface.

## Decision

We document and clarify the dual-backend layout as follows:

### `backend/` — Primary API Service

**Purpose:** The canonical backend service for quantumanic.

**Technology Stack:**
- Express.js (Node.js)
- mathjs for quantum computations
- RESTful API for circuit simulation

**Responsibilities:**
- Quantum circuit simulation and execution
- API endpoint handling (POST /api/circuit/run, GET /health, etc.)
- Rate limiting and security controls
- Input validation

**Deployment:** This is the service that should be deployed to production.

### `frontend/backend/` — Legacy or Alternative Backend

**Purpose:** [To be determined by the team]

This directory may serve one of the following purposes:
1. **Legacy backend** — An older implementation kept for reference or gradual migration
2. **Alternative backend** — A Python-based backend for specific use cases or experimentation
3. **Development/testing backend** — A secondary implementation for testing or CI purposes
4. **Unused artifact** — Code that is no longer actively maintained

**Action Required:** The team should clarify the purpose of this directory and document it in `frontend/backend/README.md`.

## Consequences

### Positive
- Clear understanding of which backend is canonical
- Reduced confusion during deployment and maintenance
- Ability to audit the correct backend for security vulnerabilities
- Foundation for future consolidation or cleanup

### Negative
- If `frontend/backend/` is truly legacy, it represents technical debt that should be addressed
- Maintaining two backends increases testing and deployment complexity

## Migration Path

If `frontend/backend/` is determined to be legacy or unused:
1. Document its status clearly
2. Mark it as deprecated in the README
3. Plan for removal in a future sprint
4. Ensure all CI workflows and deployment scripts target `backend/` only

If `frontend/backend/` serves an active purpose:
1. Document its purpose clearly
2. Establish clear ownership and maintenance responsibilities
3. Ensure both backends are included in security audits
4. Coordinate deployment of both services

## References

- `ARCHITECTURE.md` — High-level architecture overview
- `backend/README.md` — Primary backend documentation
- `frontend/backend/README.md` — Secondary backend documentation
