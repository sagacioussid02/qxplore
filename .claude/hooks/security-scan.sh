#!/bin/bash
# Runs bandit security scan on any Python file Claude edits.
# Runs as PostToolUse on Edit|Write — fires after the file is saved.
# Prints a warning if high-severity issues are found, but does NOT block the edit.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# Only act on Python files
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then exit 0; fi
if [[ "$FILE_PATH" != *.py ]]; then exit 0; fi
if [[ ! -f "$FILE_PATH" ]]; then exit 0; fi

# Find bandit — check venv first, then PATH
BANDIT=""
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [[ -x "$PROJECT_ROOT/venv/bin/bandit" ]]; then
  BANDIT="$PROJECT_ROOT/venv/bin/bandit"
elif command -v bandit &>/dev/null; then
  BANDIT="bandit"
else
  echo "⚠️  security-scan: bandit not found. Run: pip install bandit" >&2
  exit 0
fi

# Run bandit — only flag medium+ severity, medium+ confidence
RESULT=$("$BANDIT" -q -ll -ii "$FILE_PATH" 2>/dev/null)
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  echo "✅ security-scan: $FILE_PATH — no issues found" >&2
elif [[ $EXIT_CODE -eq 1 ]]; then
  echo "" >&2
  echo "⚠️  security-scan: bandit found issues in $FILE_PATH:" >&2
  echo "$RESULT" | tail -20 >&2
  echo "" >&2
  echo "   Run 'bandit $FILE_PATH' for full details." >&2
else
  echo "⚠️  security-scan: bandit failed to scan $FILE_PATH (exit $EXIT_CODE)" >&2
fi

# Always exit 0 — warnings only, never block the edit
exit 0
