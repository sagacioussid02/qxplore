# Task Registry

## Active Tasks

### TASK-001: Implement Toffoli Gate
**Priority:** High  
**Assignee:** Unassigned  
**Status:** Pending  
**Description:** Implement the three-qubit Toffoli (CCNOT) gate for quantum circuit simulation.  
**Acceptance Criteria:**
- Toffoli gate logic correctly implements controlled-controlled-NOT
- Unit tests cover all 8 basis states
- Integration test with existing gates passes

---

### TASK-002: Rate Limiting Enhancement
**Priority:** Medium  
**Assignee:** Unassigned  
**Status:** Pending  
**Description:** Enhance rate limiting to support per-user limits (authenticated) in addition to per-IP limits.  
**Acceptance Criteria:**
- Rate limit middleware accepts optional user ID parameter
- Per-user limits are tied to authenticated identity, not mutable headers
- Backward compatibility with IP-based limits maintained

---

### TASK-003: Frontend Circuit Builder
**Priority:** Medium  
**Assignee:** Unassigned  
**Status:** Pending  
**Description:** Build React component for interactive quantum circuit construction.  
**Acceptance Criteria:**
- Drag-and-drop gate placement
- Visual circuit representation
- API integration for circuit execution

---

### TASK-004: Documentation: Quantum Concepts Guide
**Priority:** Low  
**Assignee:** Unassigned  
**Status:** Pending  
**Description:** Create educational documentation explaining quantum gates and circuit concepts for new contributors.  
**Acceptance Criteria:**
- Covers X, H, Z, Y, S, T gates
- Includes mathematical notation and intuitive explanations
- Links to external references (Qiskit docs, etc.)

---

### TASK-005: CI Enforcement of Task Assignment Policy
**Priority:** Medium  
**Assignee:** Engineering Team  
**Status:** Pending  
**Milestone:** Q3 2026  
**Description:** Implement automated CI checks to enforce `TASK_ASSIGNMENT_POLICY.md` rules, including branch protection validation and task lifecycle tracking.  
**Acceptance Criteria:**
- CI job validates that engineers cannot push to main/master
- CI job validates that all PRs reference at least one task
- CI job validates that task status transitions follow policy
- Documentation updated with CI enforcement details

---

## Completed Tasks

(None yet)
