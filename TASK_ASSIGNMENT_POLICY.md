# Task Assignment Policy

## Overview

This document defines how tasks are assigned, tracked, and completed in the quantumanic project. All engineers must follow this policy to maintain project coherence and prevent duplicate work.

---

## Task Lifecycle

### States

1. **Pending** — Task is identified but not yet assigned or started
2. **In Progress** — Task is assigned and work has begun
3. **In Review** — Task is complete; PR is open and awaiting review
4. **Completed** — Task is merged and closed

### Transitions

```
Pending → In Progress → In Review → Completed
```

Once a task reaches **Completed**, it is archived and not reopened. If similar work is needed, a new task is created.

---

## Assignment Rules

### Who Can Assign Tasks

- **Operator** — Can assign any task to any engineer
- **Engineer** — Can self-assign a task if it is currently unassigned
- **Tech Lead** — Can reassign tasks if an engineer becomes unavailable

### Assignment Constraints

- Each task must have exactly one assignee (no co-ownership)
- An engineer cannot be assigned more than 5 active tasks at once
- Tasks must be assigned before work begins; self-assignment is acceptable
- If an engineer cannot complete a task, they must notify the operator immediately

---

## PR and Commit Rules

### Branch Naming

All work must be done on a feature branch named:

```
minions/<role>/<short-summary>
```

Example: `minions/engineer/implement-toffoli-gate`

**Branch Protection Enforcement:** Engineers do not have write access to `main` or `master`. This is enforced by repository-level branch protection rules. Attempts to push directly to these branches will be rejected by the Git server.

### Commit Messages

Each commit must reference the task ID:

```
feat(TASK-001): implement Toffoli gate logic
```

Format: `<type>(<TASK-ID>): <description>`

Valid types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`

### Pull Requests

- One PR per task (or one PR per closely-related task group)
- PR title must match commit message format
- PR description must include:
  - Task ID and title
  - Acceptance criteria checklist
  - Testing approach
  - Any blockers or dependencies

---

## Review Process

### Peer Review (Round 1)

1. Engineer opens PR on feature branch
2. Peer engineer reviews code, docs, and tests
3. Peer approves or requests changes
4. If changes requested, engineer commits fix and re-requests review

### Operator Review (Round 2)

1. After peer approval, operator reviews the PR
2. Operator checks:
   - Task acceptance criteria are met
   - No scope creep
   - No security or policy violations
3. Operator approves or requests changes
4. If approved, operator merges PR to main

### CI Requirements

Before any review, CI must pass:
- All tests pass
- Linting passes
- No security vulnerabilities introduced
- Branch protection rules enforced (engineers cannot merge)

---

## Task Tracking

### TASKS.md Registry

All tasks are tracked in `TASKS.md` at the repository root. This file is the source of truth.

**Format:**

```markdown
### TASK-NNN: <Title>
**Priority:** <High|Medium|Low>  
**Assignee:** <Name or "Unassigned">  
**Status:** <Pending|In Progress|In Review|Completed>  
**Milestone:** <Optional: Q3 2026, etc.>  
**Description:** <One-line summary>  
**Acceptance Criteria:**
- Criterion 1
- Criterion 2
```

### Updating TASKS.md

- When a task is assigned, update the **Assignee** field
- When work begins, update **Status** to "In Progress"
- When a PR is opened, update **Status** to "In Review"
- When a PR is merged, update **Status** to "Completed" and move to the "Completed Tasks" section
- Do not delete tasks; archive them in the "Completed Tasks" section

---

## Decision Records

Material decisions (feature scope, dependency upgrades, security patches, cost changes, team composition) require a Decision Record before implementation.

**Decision Record Template:**

```markdown
# Decision Record: <Title>

**Date:** YYYY-MM-DD  
**Proposer:** <Engineer Name>  
**Approver:** <Operator Name>  
**Status:** <Proposed|Approved|Rejected|Superseded>

## Context

<Why is this decision needed?>

## Options Considered

1. <Option A>
2. <Option B>
3. <Option C>

## Decision

<Which option was chosen and why?>

## Consequences

<What are the trade-offs and long-term implications?>
```

Decision Records are stored in `docs/decisions/` and referenced in PRs that implement them.

---

## Escalation

If an engineer encounters a blocker, they must:

1. Document the blocker in the PR description
2. Notify the operator via the PR comment thread
3. Do not merge without operator approval

If a task is reassigned or cancelled, the operator must update `TASKS.md` and notify all stakeholders.

---

## Audit and Compliance

The operator conducts a monthly audit of `TASKS.md` to ensure:
- No tasks are stale (>30 days without status update)
- Assignees are still available
- Completed tasks are properly archived
- No duplicate tasks exist

Results are logged in `docs/audit/` for compliance tracking.
