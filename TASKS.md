# Quantumanic Task Backlog

This document tracks unassigned engineering tasks for the quantumanic project. Each task includes acceptance criteria, priority, and effort estimate.

## Task 1: Implement Multi-Qubit Gate Support (CNOT/CX)

**Priority:** High  
**Effort:** 8 points  
**Status:** Unassigned  

### Description

Implement CNOT (Controlled-NOT / CX) gate support in the quantum simulator. This is a two-qubit gate essential for quantum circuit construction.

### Acceptance Criteria

- [ ] CNOT gate logic implemented in `backend/src/quantum/gates.js`
- [ ] Gate accepts control and target qubit indices
- [ ] Correctly applies controlled X operation to target qubit
- [ ] Unit tests cover single and multiple CNOT operations
- [ ] API endpoint `/api/circuit/run` accepts CNOT in circuit definition
- [ ] Documentation updated in README.md with CNOT example

### Technical Notes

- CNOT matrix for 2 qubits: applies X gate to target if control qubit is |1⟩
- Use mathjs for matrix operations (consistent with existing gates)
- Validate qubit indices are within circuit size

---

## Task 2: Implement SWAP Gate

**Priority:** High  
**Effort:** 5 points  
**Status:** Unassigned  

### Description

Implement SWAP gate for exchanging quantum states between two qubits.

### Acceptance Criteria

- [ ] SWAP gate logic implemented in `backend/src/quantum/gates.js`
- [ ] Correctly exchanges state vectors of two qubits
- [ ] Unit tests verify state exchange for |0⟩, |1⟩, and superposition states
- [ ] API endpoint `/api/circuit/run` accepts SWAP in circuit definition
- [ ] Integration test with other gates (e.g., H followed by SWAP)

### Technical Notes

- SWAP matrix: [[1,0,0,0],[0,0,1,0],[0,1,0,0],[0,0,0,1]]
- Validate qubit indices are distinct and within circuit size

---

## Task 3: Implement Toffoli (CCNOT) Gate

**Priority:** Medium  
**Effort:** 13 points  
**Status:** Unassigned  

### Description

Implement Toffoli (Controlled-Controlled-NOT) gate for three-qubit operations. This is a universal gate for reversible computation.

### Acceptance Criteria

- [ ] Toffoli gate logic implemented in `backend/src/quantum/gates.js`
- [ ] Accepts two control qubits and one target qubit
- [ ] Applies X to target only if both controls are |1⟩
- [ ] Unit tests cover all 8 basis states for 3-qubit system
- [ ] API endpoint `/api/circuit/run` accepts Toffoli in circuit definition
- [ ] Performance tested with circuits containing multiple Toffoli gates

### Technical Notes

- Toffoli is a 3-qubit gate; matrix is 8×8
- Validate all three qubit indices are distinct and within circuit size
- Consider performance implications for larger circuits

---

## Task 4: Enhance Frontend Circuit Builder UI

**Priority:** Medium  
**Effort:** 8 points  
**Status:** Unassigned  

### Description

Improve the React-based circuit builder UI with drag-and-drop gate placement, visual circuit representation, and real-time state preview.

### Acceptance Criteria

- [ ] Drag-and-drop gate placement implemented
- [ ] Visual circuit grid displays qubits and gates clearly
- [ ] Gate palette shows all supported gates (X, H, Z, Y, S, T, CNOT, SWAP)
- [ ] Real-time state vector preview updates as circuit is modified
- [ ] "Run Circuit" button executes circuit via backend API
- [ ] Results display shows measurement probabilities and final state
- [ ] Unit tests for circuit builder components (Jest + React Testing Library)
- [ ] Responsive design works on desktop and tablet

### Technical Notes

- Use React hooks for state management
- Integrate with existing `/api/circuit/run` endpoint
- Consider accessibility (ARIA labels, keyboard navigation)

---

## Task 5: Add Comprehensive Test Coverage for Quantum Simulator

**Priority:** High  
**Effort:** 8 points  
**Status:** Unassigned  

### Description

Expand test suite for the quantum simulator to achieve >80% code coverage and validate correctness of all gate operations.

### Acceptance Criteria

- [ ] Unit tests for all single-qubit gates (X, H, Z, Y, S, T)
- [ ] Unit tests for all multi-qubit gates (CNOT, SWAP, Toffoli)
- [ ] Integration tests for multi-gate circuits
- [ ] Tests for measurement and probability calculations
- [ ] Tests for edge cases (invalid qubit indices, malformed circuits)
- [ ] Code coverage report shows >80% coverage for `backend/src/quantum/`
- [ ] All tests pass in CI pipeline

### Technical Notes

- Use Jest test framework (already in package.json)
- Test against known quantum states and expected outputs
- Include tests for numerical precision (floating-point comparisons)

---

## Task 6: Implement Rate Limiting Audit Logging

**Priority:** Medium  
**Effort:** 5 points  
**Status:** Unassigned  

### Description

Add audit logging for rate limit violations to track abuse patterns and support security investigations.

### Acceptance Criteria

- [ ] Rate limit violations logged with timestamp, IP, endpoint, and request count
- [ ] Logs written to a dedicated audit log file or service
- [ ] Audit log includes successful rate limit resets
- [ ] Sensitive data (full request bodies) not logged
- [ ] Log rotation configured to prevent unbounded disk usage
- [ ] Documentation added to CONTRIBUTING.md on audit log access
- [ ] Unit tests verify logging behavior

### Technical Notes

- Integrate with existing rate limiting middleware in `backend/src/`
- Use structured logging (JSON format for easy parsing)
- Consider log aggregation for production deployments

---

## Assignment Guidelines

1. **New Engineer Onboarding:** Start with Task 1 (CNOT) or Task 4 (Frontend UI) — both are well-scoped and have clear acceptance criteria.
2. **Pair Programming:** Consider pairing Task 1 and Task 5 (tests) to ensure quality.
3. **Sprint Planning:** Assign 2–3 tasks per 2-week sprint based on team capacity.
4. **Blockers:** Task 3 (Toffoli) depends on Task 1 (CNOT) being complete.

## Updating This Document

When a task is assigned:
1. Update the **Status** field to the assignee's name
2. Create a corresponding GitHub issue or link to the PR
3. Move the task to the current sprint in SPRINT_PLAN.md
