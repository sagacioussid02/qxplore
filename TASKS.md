# Quantumanic Task Registry

This document tracks all pending engineer tasks for the quantumanic project. Tasks are prioritized and available for assignment.

## Task Assignment Workflow

See [TASK_ASSIGNMENT_POLICY.md](TASK_ASSIGNMENT_POLICY.md) for the full assignment and lifecycle workflow.

---

## Pending Tasks (12 total)

### High Priority

#### TASK-001: Implement Toffoli Gate
**Priority:** High  
**Status:** Unassigned  
**Effort:** 5 points  
**Description:** Implement the Toffoli (CCNOT) three-qubit gate in the quantum simulator.

**Acceptance Criteria:**
- Toffoli gate correctly applies to three qubits
- Unit tests cover all input combinations
- Documentation updated in gates.js
- Integration test passes with circuit runner

**Files:** `backend/src/quantum/gates.js`, `backend/tests/gates.test.js`

---

#### TASK-002: Add SWAP Gate Support
**Priority:** High  
**Status:** Unassigned  
**Effort:** 3 points  
**Description:** Implement the SWAP gate for exchanging qubit states.

**Acceptance Criteria:**
- SWAP gate correctly exchanges two qubits
- Works with multi-qubit circuits
- Unit tests pass
- API endpoint accepts SWAP in circuit definition

**Files:** `backend/src/quantum/gates.js`, `backend/src/api/routes.js`

---

#### TASK-003: Implement Circuit Optimization
**Priority:** High  
**Status:** Unassigned  
**Effort:** 8 points  
**Description:** Add circuit optimization pass to reduce gate count and improve simulation performance.

**Acceptance Criteria:**
- Consecutive identical gates are merged
- Redundant gates (e.g., X-X) are removed
- Optimization preserves circuit semantics
- Performance improvement measured and documented

**Files:** `backend/src/quantum/optimizer.js`, `backend/tests/optimizer.test.js`

---

### Medium Priority

#### TASK-004: Enhance Rate Limiting
**Priority:** Medium  
**Status:** Unassigned  
**Effort:** 5 points  
**Description:** Implement per-user rate limiting (currently IP-based only) and add rate limit headers to responses.

**Acceptance Criteria:**
- Rate limiting works with user authentication
- Rate limit info included in response headers
- Graceful degradation when rate limit exceeded
- Tests cover edge cases

**Files:** `backend/src/middleware/rateLimit.js`, `backend/tests/rateLimit.test.js`

---

#### TASK-005: Add Circuit Visualization Export
**Priority:** Medium  
**Status:** Unassigned  
**Effort:** 6 points  
**Description:** Implement export of circuit diagrams as SVG or PNG for documentation and sharing.

**Acceptance Criteria:**
- Circuits can be exported as SVG
- Export includes gate labels and qubit indices
- API endpoint returns exportable format
- Frontend integration tested

**Files:** `backend/src/quantum/visualizer.js`, `backend/src/api/routes.js`

---

#### TASK-006: Implement Measurement Error Simulation
**Priority:** Medium  
**Status:** Unassigned  
**Effort:** 7 points  
**Description:** Add realistic measurement error modeling to simulate real quantum hardware noise.

**Acceptance Criteria:**
- Configurable error rates per qubit
- Error model applied during measurement
- Results match expected statistical distribution
- Documentation explains error model

**Files:** `backend/src/quantum/simulator.js`, `backend/tests/simulator.test.js`

---

#### TASK-007: Add Circuit History and Undo
**Priority:** Medium  
**Status:** Unassigned  
**Effort:** 4 points  
**Description:** Implement circuit history tracking and undo/redo functionality in the frontend.

**Acceptance Criteria:**
- Circuit state history is maintained
- Undo/redo buttons work correctly
- History persists during session
- Tests cover edge cases (empty history, multiple undos)

**Files:** `frontend/src/store/circuitStore.ts`, `frontend/src/components/CircuitBuilder.tsx`

---

### Low Priority

#### TASK-008: Improve Error Messages
**Priority:** Low  
**Status:** Unassigned  
**Effort:** 3 points  
**Description:** Enhance error messages for better developer experience and debugging.

**Acceptance Criteria:**
- Error messages are descriptive and actionable
- Include suggestions for common mistakes
- Consistent formatting across API
- Tests verify error message content

**Files:** `backend/src/api/routes.js`, `backend/src/quantum/simulator.js`

---

#### TASK-009: Add Telemetry and Monitoring
**Priority:** Low  
**Status:** Unassigned  
**Effort:** 6 points  
**Description:** Implement basic telemetry collection for circuit execution metrics and API usage.

**Acceptance Criteria:**
- Circuit execution time tracked
- API endpoint usage logged
- Metrics exportable for analysis
- Privacy-respecting (no sensitive data logged)

**Files:** `backend/src/middleware/telemetry.js`, `backend/src/api/routes.js`

---

#### TASK-010: Expand Gate Library Documentation
**Priority:** Low  
**Status:** Unassigned  
**Effort:** 2 points  
**Description:** Add comprehensive documentation for all supported quantum gates with examples.

**Acceptance Criteria:**
- Each gate has a documentation section
- Includes matrix representation
- Includes usage examples
- Links to quantum computing references

**Files:** `docs/GATES.md` (new), `backend/src/quantum/gates.js`

---

#### TASK-011: Implement Batch Circuit Execution
**Priority:** Low  
**Status:** Unassigned  
**Effort:** 5 points  
**Description:** Add API endpoint for executing multiple circuits in a single request for efficiency.

**Acceptance Criteria:**
- Batch endpoint accepts array of circuits
- Results returned in same order
- Performance improvement over sequential calls
- Tests cover batch size limits

**Files:** `backend/src/api/routes.js`, `backend/tests/routes.test.js`

---

#### TASK-012: Add Accessibility Improvements to Frontend
**Priority:** Low  
**Status:** Unassigned  
**Effort:** 4 points  
**Description:** Improve frontend accessibility with ARIA labels, keyboard navigation, and screen reader support.

**Acceptance Criteria:**
- ARIA labels on all interactive elements
- Keyboard navigation works throughout UI
- Screen reader tested and verified
- WCAG 2.1 AA compliance

**Files:** `frontend/src/components/CircuitBuilder.tsx`, `frontend/src/components/GatePanel.tsx`

---

## Assignment Instructions

1. **Self-assign:** Comment on the task or update this file with your name
2. **Create branch:** `minions/engineer/<task-id>-<short-title>`
3. **Work:** Follow the acceptance criteria and files listed
4. **Submit PR:** Reference the task ID in your PR title
5. **Review:** Peer review required before merge

## Completed Tasks

(None yet — this is the initial task registry)
