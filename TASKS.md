# Quantumanic Task Registry

All work on the quantumanic project is tracked here. Tasks are assigned based on role and priority.

## Task Assignment Policy

See `TASK_ASSIGNMENT_POLICY.md` for role-based task assignment rules.

---

## Active Tasks

### TASK-001: Implement Toffoli Gate
- **Status:** Open
- **Priority:** High
- **Points:** 5
- **Assigned To:** [Unassigned]
- **Description:** Add support for the Toffoli (CCNOT) gate to the quantum simulator. The Toffoli gate is a three-qubit gate that flips the target qubit if both control qubits are in state |1⟩.
- **Acceptance Criteria:**
  - [ ] Toffoli gate matrix is correctly defined
  - [ ] Gate can be applied to any three qubits in a circuit
  - [ ] Unit tests verify correct behavior
  - [ ] API endpoint `/api/circuit/run` accepts Toffoli gates
- **Related Files:** `backend/src/quantum/gates.js`, `backend/src/quantum/simulator.js`, `backend/tests/`

### TASK-002: Implement CNOT Gate
- **Status:** Open
- **Priority:** High
- **Points:** 8
- **Assigned To:** [Unassigned]
- **Description:** Add support for the CNOT (Controlled-NOT / CX) gate to the quantum simulator. CNOT is a two-qubit gate that flips the target qubit if the control qubit is in state |1⟩.
- **Acceptance Criteria:**
  - [ ] CNOT gate matrix is correctly defined
  - [ ] Gate can be applied to any two qubits in a circuit
  - [ ] Unit tests verify correct behavior
  - [ ] API endpoint `/api/circuit/run` accepts CNOT gates
- **Related Files:** `backend/src/quantum/gates.js`, `backend/src/quantum/simulator.js`, `backend/tests/`

### TASK-003: Implement SWAP Gate
- **Status:** Open
- **Priority:** Medium
- **Points:** 5
- **Assigned To:** [Unassigned]
- **Description:** Add support for the SWAP gate to the quantum simulator. SWAP exchanges the states of two qubits.
- **Acceptance Criteria:**
  - [ ] SWAP gate matrix is correctly defined
  - [ ] Gate can be applied to any two qubits in a circuit
  - [ ] Unit tests verify correct behavior
  - [ ] API endpoint `/api/circuit/run` accepts SWAP gates
- **Related Files:** `backend/src/quantum/gates.js`, `backend/src/quantum/simulator.js`, `backend/tests/`

### TASK-004: Rate Limiting Enhancement
- **Status:** Open
- **Priority:** Medium
- **Points:** 8
- **Assigned To:** [Unassigned]
- **Description:** Enhance rate limiting to support per-user limits (when authentication is added) and configurable burst allowances.
- **Acceptance Criteria:**
  - [ ] Rate limiting middleware supports per-user tracking
  - [ ] Burst allowance can be configured per endpoint
  - [ ] Tests verify rate limit enforcement
  - [ ] Documentation updated in README.md
- **Related Files:** `backend/src/api/routes.js`, `backend/tests/`

### TASK-005: Implement Automated Policy Enforcement
- **Status:** Open
- **Priority:** Medium
- **Points:** 5
- **Assigned To:** [Unassigned]
- **Description:** Add a CI check to validate that `TASK_ASSIGNMENT_POLICY.md` rules are enforced. This includes verifying that assigned tasks match role permissions and that task status transitions are valid.
- **Acceptance Criteria:**
  - [ ] CI job validates task assignments against `TASK_ASSIGNMENT_POLICY.md`
  - [ ] Linter or schema validator checks `TASKS.md` format
  - [ ] CI fails if policy violations are detected
  - [ ] Documentation added to `CONTRIBUTING.md`
- **Related Files:** `.github/workflows/` or CI config, `TASK_ASSIGNMENT_POLICY.md`, `TASKS.md`
- **Follow-up to:** Crew review feedback on automated enforcement

### TASK-006: Frontend Circuit Builder MVP
- **Status:** Open
- **Priority:** Medium
- **Points:** 13
- **Assigned To:** [Unassigned]
- **Description:** Build a React-based circuit builder UI that allows users to visually construct quantum circuits and execute them via the backend API.
- **Acceptance Criteria:**
  - [ ] UI displays a grid for qubits and time steps
  - [ ] Users can drag-and-drop gates onto qubits
  - [ ] Circuit can be serialized and sent to `/api/circuit/run`
  - [ ] Results are displayed as a probability histogram
  - [ ] Responsive design works on mobile and desktop
- **Related Files:** `frontend/src/`, `frontend/tests/`

### TASK-007: Input Validation Hardening
- **Status:** Open
- **Priority:** High
- **Points:** 5
- **Assigned To:** [Unassigned]
- **Description:** Strengthen input validation on the backend to reject malformed circuit requests and prevent injection attacks.
- **Acceptance Criteria:**
  - [ ] All circuit parameters are validated before processing
  - [ ] Invalid gate names are rejected
  - [ ] Qubit indices are bounds-checked
  - [ ] Tests cover edge cases and malformed inputs
- **Related Files:** `backend/src/api/routes.js`, `backend/tests/`

### TASK-008: Documentation: Quantum Concepts Guide
- **Status:** Open
- **Priority:** Low
- **Points:** 8
- **Assigned To:** [Unassigned]
- **Description:** Write a beginner-friendly guide to quantum computing concepts (superposition, entanglement, measurement) for contributors and users.
- **Acceptance Criteria:**
  - [ ] Guide covers at least 5 core quantum concepts
  - [ ] Includes diagrams or visual aids
  - [ ] Linked from README.md
  - [ ] Reviewed for accuracy
- **Related Files:** `docs/QUANTUM_CONCEPTS.md`

### TASK-009: Performance: Circuit Simulation Optimization
- **Status:** Open
- **Priority:** Low
- **Points:** 13
- **Assigned To:** [Unassigned]
- **Description:** Optimize the quantum circuit simulator for large circuits (10+ qubits). Profile and reduce memory usage and computation time.
- **Acceptance Criteria:**
  - [ ] Profiling shows memory usage < 100MB for 10-qubit circuits
  - [ ] Simulation time < 1s for typical 10-qubit circuits
  - [ ] Benchmarks documented in `docs/PERFORMANCE.md`
  - [ ] No regression in correctness
- **Related Files:** `backend/src/quantum/simulator.js`, `backend/tests/`

### TASK-010: Testing: Integration Test Suite
- **Status:** Open
- **Priority:** Medium
- **Points:** 8
- **Assigned To:** [Unassigned]
- **Description:** Build an integration test suite that verifies the full flow from circuit submission to result retrieval.
- **Acceptance Criteria:**
  - [ ] Tests cover happy path and error cases
  - [ ] Tests verify rate limiting behavior
  - [ ] Tests verify input validation
  - [ ] Coverage > 80%
- **Related Files:** `backend/tests/integration/`

### TASK-011: Frontend: Dark Mode Support
- **Status:** Open
- **Priority:** Low
- **Points:** 3
- **Assigned To:** [Unassigned]
- **Description:** Add dark mode toggle to the frontend UI with persistent user preference.
- **Acceptance Criteria:**
  - [ ] Dark mode theme is visually consistent
  - [ ] User preference is saved to localStorage
  - [ ] Toggle is accessible from UI
  - [ ] No accessibility regressions
- **Related Files:** `frontend/src/`, `frontend/tests/`

### TASK-012: Documentation: API Reference
- **Status:** Open
- **Priority:** Medium
- **Points:** 5
- **Assigned To:** [Unassigned]
- **Description:** Write comprehensive API documentation for all backend endpoints, including request/response examples and error codes.
- **Acceptance Criteria:**
  - [ ] All endpoints documented
  - [ ] Request/response examples provided
  - [ ] Error codes and messages documented
  - [ ] Linked from README.md
- **Related Files:** `docs/API.md`

---

## Completed Tasks

(None yet)

---

## Task Lifecycle

1. **Open** — Task is available for assignment
2. **In Progress** — Assigned engineer is actively working
3. **In Review** — PR is open and awaiting review
4. **Done** — PR is merged and task is complete

## Updating Tasks

When you start work on a task:
1. Update "Assigned To" with your name
2. Change "Status" to "In Progress"
3. Open a PR and link it in the task description
4. When PR is merged, change "Status" to "Done"

## Points System

Points estimate effort using Fibonacci sequence:
- **1** — Trivial (< 1 hour)
- **2** — Very small (1-2 hours)
- **3** — Small (2-4 hours)
- **5** — Medium (4-8 hours)
- **8** — Large (1-2 days)
- **13** — Very large (2-3 days)

## Priority Levels

- **High** — Critical for MVP or blocks other work
- **Medium** — Important but not blocking
- **Low** — Nice-to-have or polish
