# Lessons Learned

Operator-curated incident log. One entry per production-impacting event
or near-miss that the agent crews could have prevented. Read at the top
of every planning + engineering prompt so the same mistake is not made
twice.

## How to use

When something breaks (or almost breaks) on this project:

1. **Add an entry** below using the template. Be specific — name files,
   commit shas, error messages.
2. **Keep entries permanent.** Even after the bug is fixed, the lesson
   stays so future agents see it.
3. **Reference cited paths** with `path:line` anchors when relevant;
   the discoverer crew and planning agents read them the same way they
   read `PROJECT_DOSSIER.md`.

### Entry template

```markdown
## YYYY-MM-DD — <one-line title>

**Symptom**: What the user / operator saw.
**Root cause**: The actual technical reason, with `path:line` anchors.
**Detection gap**: Why preflight / CI / review missed it.
**Prevention**: The specific rule a future agent must follow.
```

### Agent-facing rules derived from these lessons

When you (the agent) are working on this repo:

- Before touching any config file, check whether a sibling file
  (`*.js` vs `*.ts`, `*.toml` vs `*.yaml`) already exists. Most build
  tools load only one when both are present. Pick one, delete the
  other, or keep them in sync.
- Before adding a dependency to source code, confirm it's declared in
  the package manifest (`package.json`, `pyproject.toml`, `Cargo.toml`,
  `go.mod`) AND the lockfile is updated.
- Before adding a remote hostname to any `<img>` / `<a href>` / fetch
  call, confirm the framework's allowlist (`next.config.*` images
  block, CSP headers, CORS config) accepts it.
- Before opening a PR that touches a known foot-gun listed below,
  re-read the relevant lesson entry and explicitly note in the PR
  description how the change avoids the past failure.

## Entries

_(none yet — add one when the first incident happens)_
