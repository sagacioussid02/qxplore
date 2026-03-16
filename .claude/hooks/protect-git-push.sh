#!/bin/bash
# Blocks Claude from running git push commands directly.
# Exit 2 + stderr message = tool call is denied and the reason is shown to Claude.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
COMMAND=$(echo "$INPUT"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

if [[ "$TOOL_NAME" == "Bash" ]]; then
  # Match any git push variant (push, push --force, push origin main, etc.)
  if echo "$COMMAND" | grep -qE '(^|[;&|]|\s)git\s+push(\s|$)'; then
    echo "🔒 Blocked by .claude/hooks/protect-git-push.sh: Claude is not allowed to run 'git push' directly. Stage and commit changes, then ask the user to review and push." >&2
    exit 2
  fi
fi

exit 0
