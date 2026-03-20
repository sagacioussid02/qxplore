#!/bin/bash
# Blocks Claude from running destructive shell commands.
# Exit 2 + stderr message = tool call is denied and reason is shown to Claude.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
COMMAND=$(echo "$INPUT"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

if [[ "$TOOL_NAME" == "Bash" ]] && [[ -n "$COMMAND" ]]; then
  # Block rm -rf (and variants: rm -fr, rm --recursive --force, etc.)
  if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|--recursive|--force)[^;]*'; then
    echo "🔒 Blocked by .claude/hooks/protect-destructive.sh: 'rm -rf' style commands are not allowed. Delete files individually or ask the user to run this command manually." >&2
    exit 2
  fi

  # Block dropping database tables
  if echo "$COMMAND" | grep -qiE 'DROP\s+TABLE'; then
    echo "🔒 Blocked by .claude/hooks/protect-destructive.sh: DROP TABLE is not allowed. Ask the user to run destructive database commands manually." >&2
    exit 2
  fi

  # Block truncating tables
  if echo "$COMMAND" | grep -qiE 'TRUNCATE\s+TABLE'; then
    echo "🔒 Blocked by .claude/hooks/protect-destructive.sh: TRUNCATE TABLE is not allowed. Ask the user to run destructive database commands manually." >&2
    exit 2
  fi

  # Block unqualified DELETE (no WHERE clause)
  if echo "$COMMAND" | grep -qiE 'DELETE\s+FROM\s+\w+\s*;?\s*$'; then
    echo "🔒 Blocked by .claude/hooks/protect-destructive.sh: DELETE without a WHERE clause is not allowed. Ask the user to run bulk deletes manually." >&2
    exit 2
  fi
fi

exit 0
