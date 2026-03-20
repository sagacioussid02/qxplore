#!/bin/bash
# Auto-creates a GitHub draft PR after Claude commits code.
# Runs as PostToolUse on Bash — fires after every bash command.
# Only acts when the command was a git commit AND we're on a non-main branch.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
COMMAND=$(echo "$INPUT"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Only act on Bash tool calls that contain a git commit
if [[ "$TOOL_NAME" != "Bash" ]]; then exit 0; fi
if ! echo "$COMMAND" | grep -qE '(^|[;&|]\s*)git\s+commit'; then exit 0; fi

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [[ -z "$BRANCH" ]]; then exit 0; fi

# Skip protected branches — PRs don't make sense from main/master/develop
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" || "$BRANCH" == "develop" ]]; then
  echo "ℹ️  auto-draft-pr: on protected branch '$BRANCH', skipping PR creation." >&2
  exit 0
fi

# Check gh CLI is available
if ! command -v gh &>/dev/null; then
  echo "⚠️  auto-draft-pr: 'gh' CLI not found. Install it to enable auto PR creation." >&2
  exit 0
fi

# Push branch to remote (in case it hasn't been pushed yet)
git push -u origin "$BRANCH" --quiet 2>/dev/null

# Check if a PR already exists for this branch
EXISTING_PR=$(gh pr list --head "$BRANCH" --json number --jq '.[0].number' 2>/dev/null)
if [[ -n "$EXISTING_PR" ]]; then
  PR_URL=$(gh pr view "$EXISTING_PR" --json url --jq '.url' 2>/dev/null)
  echo "ℹ️  auto-draft-pr: PR #$EXISTING_PR already exists → $PR_URL" >&2
  exit 0
fi

# Get last commit message to use as PR title
COMMIT_MSG=$(git log -1 --format="%s" 2>/dev/null)
BRANCH_LABEL="${BRANCH//-/ }"

# Create draft PR
PR_URL=$(gh pr create \
  --draft \
  --title "$COMMIT_MSG" \
  --body "$(cat <<EOF
## Changes
Auto-generated draft PR from Claude Code after commit on \`$BRANCH\`.

**Branch:** \`$BRANCH\`
**Commit:** \`$(git log -1 --format="%h")\`

---
> ⚠️ This is a **draft PR** — review the changes before marking ready to merge.

🤖 Auto-opened by \`.claude/hooks/auto-draft-pr.sh\`
EOF
)" \
  --head "$BRANCH" 2>/dev/null)

if [[ -n "$PR_URL" ]]; then
  echo "✅ auto-draft-pr: Draft PR created → $PR_URL" >&2
else
  echo "⚠️  auto-draft-pr: PR creation failed. Run 'gh pr create --draft' manually." >&2
fi

exit 0
