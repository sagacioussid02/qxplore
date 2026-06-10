# Task Assignment and Workflow Policy

This document defines the task assignment workflow, engineer responsibilities, and lifecycle management for quantumanic project tasks.

## Overview

The quantumanic project uses a centralized task registry ([TASKS.md](TASKS.md)) to track pending work. This policy ensures consistent assignment, execution, and completion of tasks.

## Task Lifecycle

```
Unassigned → Assigned → In Progress → Review → Done
```

### 1. Unassigned
- Task is listed in [TASKS.md](TASKS.md) with status "Unassigned"
- Available for any engineer to claim
- Includes priority, effort estimate, and acceptance criteria

### 2. Assigned
- Engineer claims the task by:
  - Commenting on the task in TASKS.md, or
  - Opening an issue with the task ID, or
  - Creating a feature branch with the task ID in the name
- Update TASKS.md with engineer name and assignment date
- Create feature branch: `minions/engineer/<TASK-ID>-<short-title>`

### 3. In Progress
- Engineer works on the task following acceptance criteria
- Commits follow conventional commit format: `feat: <description>` or `fix: <description>`
- Branch protection prevents direct commits to main/master
- Regular commits demonstrate progress

### 4. Review
- Engineer opens a Pull Request (PR) targeting main
- PR title includes task ID: `feat: TASK-001 implement toffoli gate`
- PR description references acceptance criteria
- Peer review required (another engineer reviews first)
- CI must pass (tests, linting, security checks)
- Operator approval required before merge

### 5. Done
- PR merged to main
- Task status updated to "Done" in TASKS.md
- Task moved to "Completed Tasks" section
- Engineer credited in commit history

## Engineer Responsibilities

### Before Starting
- [ ] Read the task acceptance criteria carefully
- [ ] Understand the files that need modification
- [ ] Check for any dependencies or blockers
- [ ] Ask for clarification if criteria are unclear

### During Development
- [ ] Follow the project's coding standards (see CONTRIBUTING.md)
- [ ] Write tests for new functionality
- [ ] Update documentation as needed
- [ ] Keep commits atomic and well-described
- [ ] Do not modify CI configuration or delete files
- [ ] Stay within the scope of the task

### Before Submitting PR
- [ ] Run all tests locally: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Verify acceptance criteria are met
- [ ] Update TASKS.md with completion status
- [ ] Write clear PR description with context

### During Review
- [ ] Respond promptly to reviewer feedback
- [ ] Make requested changes in new commits
- [ ] Do not merge your own work
- [ ] Wait for peer approval, then operator approval

## Task Assignment Rules

1. **One engineer per task** — Avoid duplicate work by claiming tasks explicitly
2. **Respect priority** — High priority tasks should be addressed first
3. **Effort estimates** — Use story points as guidance; adjust if needed
4. **Escalation** — If blocked, notify the operator immediately
5. **Abandonment** — If you cannot complete a task, return it to "Unassigned" status

## Communication

### Task Questions
- Post questions as comments in the task issue or PR
- Tag the operator (@operator) for clarification on acceptance criteria
- Document answers in the task for future reference

### Blockers
- If a task is blocked by another task, document the dependency in TASKS.md
- Notify the operator of critical blockers
- Consider working on a different task while waiting

### Progress Updates
- Commit regularly to show progress
- Update PR description with status if work spans multiple days
- Notify the operator if estimated effort changes significantly

## Acceptance Criteria Compliance

Every task must satisfy its acceptance criteria before the PR is merged:

1. **Functional requirements** — Feature works as specified
2. **Testing** — Unit tests pass; coverage maintained or improved
3. **Documentation** — Code comments and docs updated
4. **Code quality** — Linting passes; no security issues
5. **Integration** — Changes integrate cleanly with existing code

## Escalation Path

1. **Peer review stuck** → Tag the operator in the PR
2. **Acceptance criteria unclear** → Open an issue and tag the operator
3. **Task blocked by external dependency** → Notify the operator
4. **Estimated effort exceeded significantly** → Discuss with operator before continuing

## Examples

### Example 1: Claiming a Task

```markdown
# In TASKS.md

#### TASK-001: Implement Toffoli Gate
**Status:** Assigned (alice, 2024-01-15)  
**Effort:** 5 points
```

Then create a branch:
```bash
git checkout -b minions/engineer/TASK-001-implement-toffoli-gate
```

### Example 2: PR Title and Description

**Title:**
```
feat: TASK-001 implement toffoli gate
```

**Description:**
```markdown
## Task
TASK-001: Implement Toffoli Gate

## Changes
- Added Toffoli gate implementation in gates.js
- Implemented three-qubit gate logic
- Added comprehensive unit tests

## Acceptance Criteria
- [x] Toffoli gate correctly applies to three qubits
- [x] Unit tests cover all input combinations
- [x] Documentation updated in gates.js
- [x] Integration test passes with circuit runner

## Testing
All tests pass: `npm test`
Linting passes: `npm run lint`
```

## Metrics and Tracking

- **Velocity** — Tasks completed per sprint
- **Cycle time** — Time from assignment to completion
- **Effort accuracy** — Estimated vs. actual effort
- **Blocker frequency** — Tasks blocked by dependencies

These metrics help improve future task estimation and planning.

## Policy Updates

This policy may be updated as the team grows or processes evolve. Changes require operator approval and should be documented in a Decision Record.
