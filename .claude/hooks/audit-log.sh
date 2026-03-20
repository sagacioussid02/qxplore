#!/bin/bash
# Logs every file Claude edits/writes/creates to .claude/audit.log
# Runs as a PostToolUse hook after Edit, Write, or NotebookEdit tool calls.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [[ -n "$FILE_PATH" ]]; then
  LOG_FILE="$(dirname "$0")/../audit.log"
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$TOOL_NAME] $FILE_PATH" >> "$LOG_FILE"
fi

exit 0
