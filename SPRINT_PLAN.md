# Quantumanic Sprint Plan

This document outlines the sprint structure and current sprint roadmap for the quantumanic project.

## Sprint Cadence

- **Duration:** 2 weeks
- **Planning:** Monday 10:00 AM
- **Daily Standup:** 9:30 AM (async updates in Slack #quantumanic-standup)
- **Review & Retro:** Friday 4:00 PM

## Current Sprint (Sprint 5: Jan 20 – Feb 2)

### Goals

1. Onboard new engineer and assign initial tasks
2. Implement CNOT gate support (Task 1)
3. Enhance frontend circuit builder (Task 4)
4. Expand test coverage (Task 5)

### Assignments

| Task | Assignee | Status | Notes |
|------|----------|--------|-------|
| Task 1: CNOT Gate | TBD | Unassigned | High priority; blocks Task 3 |
| Task 4: Frontend UI | TBD | Unassigned | Medium priority; good for UI-focused engineer |
| Task 5: Test Coverage | TBD | Unassigned | High priority; pair with Task 1 |

### Blockers

- None currently

### Completed Items

- ✅ Dual-backend architecture documented (ADR 0001)
- ✅ Rate limiting implemented
- ✅ Input validation middleware added
- ✅ Basic quantum gates (X, H, Z, Y, S, T) implemented

---

## Upcoming Sprints

### Sprint 6 (Feb 3 – Feb 16)

**Focus:** Multi-qubit gates and test coverage

- Task 2: SWAP Gate
- Task 5: Test Coverage (continued)
- Task 6: Rate Limiting Audit Logging

### Sprint 7 (Feb 17 – Mar 2)

**Focus:** Advanced gates and performance

- Task 3: Toffoli Gate
- Performance optimization for large circuits
- Documentation updates

---

## Backlog (Future Sprints)

- Implement measurement basis selection (computational, Hadamard, etc.)
- Add circuit optimization passes
- Implement parameterized gates (RX, RY, RZ)
- Add support for custom gate definitions
- Performance benchmarking suite
- API authentication and user accounts

---

## Team Capacity

**Current Team:**
- 1 Backend Engineer (existing)
- 1 Frontend Engineer (existing)
- 1 New Standard Engineer (TBD)

**Velocity:** ~21 points per sprint (3 engineers × 7 points/engineer)

---

## Definition of Done

A task is considered complete when:

1. ✅ All acceptance criteria are met
2. ✅ Code is reviewed and approved by a peer
3. ✅ Unit tests pass (>80% coverage for new code)
4. ✅ CI pipeline passes (linting, tests, build)
5. ✅ Documentation is updated (README, inline comments, ADRs if needed)
6. ✅ PR is merged to main branch

---

## Communication

- **Slack:** #quantumanic (general), #quantumanic-standup (async updates)
- **GitHub:** Issues and PRs for task tracking
- **Weekly Sync:** Friday 4:00 PM (review + retro)

---

## Notes

- New engineer should start with Task 1 or Task 4 (well-scoped, clear criteria)
- Pair programming recommended for Tasks 1 + 5 (gates + tests)
- All PRs require peer review before merge
- Operator approval required for material decisions (see CONTRIBUTING.md)
