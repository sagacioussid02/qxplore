#!/bin/bash
# Blocks Claude from reading .env and other sensitive credential files.
# Exit 2 + stderr message = tool call is denied and reason is shown to Claude.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)
COMMAND=$(echo "$INPUT"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null)

# Patterns that should never be read by Claude
PROTECTED_PATTERNS=(
  ".env"
  ".env.local"
  ".env.production"
  ".env.staging"
  ".secrets"
  "secrets.json"
  "credentials.json"
  ".aws/credentials"
  ".netrc"
  "id_rsa"
  "id_ed25519"
  ".bash_profile"
  ".bashrc"
  ".zshrc"
  ".zprofile"
)

check_path() {
  local path="$1"
  local basename
  basename=$(basename "$path")
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    # Match exact filename or path suffix
    if [[ "$basename" == "$pattern" ]] || [[ "$path" == *"/$pattern" ]] || [[ "$basename" == "$pattern"* && "$pattern" == ".env"* ]]; then
      echo "🔒 Blocked by .claude/hooks/protect-env.sh: Reading '$path' is not allowed. This file may contain secrets. Access the values via environment variables or settings instead." >&2
      exit 2
    fi
  done
}

# Block Read tool on sensitive files
if [[ "$TOOL_NAME" == "Read" ]] && [[ -n "$FILE_PATH" ]]; then
  check_path "$FILE_PATH"
fi

# Block Bash commands that try to cat/print sensitive files
if [[ "$TOOL_NAME" == "Bash" ]] && [[ -n "$COMMAND" ]]; then
  for pattern in "${PROTECTED_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "(cat|head|tail|less|more|bat|print|echo)\s.*$pattern([^a-zA-Z]|$)"; then
      echo "🔒 Blocked by .claude/hooks/protect-env.sh: Command appears to print contents of a sensitive file ('$pattern'). Use environment variables instead." >&2
      exit 2
    fi
  done
fi

exit 0
