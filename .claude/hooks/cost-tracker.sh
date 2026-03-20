#!/bin/bash
# Tracks estimated token usage and cost per Claude session.
# Runs as a PostToolUse hook — fires after every tool call.
# Appends to .claude/costs.log with running session totals.
#
# Cost estimates based on Claude Sonnet 4.6 pricing (as of 2026):
#   Input:  $3.00 per 1M tokens
#   Output: $15.00 per 1M tokens
#
# Token estimates per tool call (conservative approximations):
#   Read/Glob/Grep   → ~500 input + ~300 output
#   Edit/Write       → ~800 input + ~400 output
#   Bash             → ~400 input + ~200 output
#   Agent            → ~2000 input + ~1000 output

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','unknown'))" 2>/dev/null)

if [[ -z "$TOOL_NAME" ]]; then exit 0; fi

# Estimate tokens per tool type
case "$TOOL_NAME" in
  Read|Glob|Grep)     IN_TOK=500;  OUT_TOK=300  ;;
  Edit|Write)         IN_TOK=800;  OUT_TOK=400  ;;
  Bash)               IN_TOK=400;  OUT_TOK=200  ;;
  Agent)              IN_TOK=2000; OUT_TOK=1000 ;;
  *)                  IN_TOK=300;  OUT_TOK=150  ;;
esac

LOG_FILE="$(dirname "$0")/../costs.log"
SESSION_FILE="/tmp/claude_session_${SESSION_ID}.cost"

# Load or init session totals
if [[ -f "$SESSION_FILE" ]]; then
  TOTAL_IN=$(awk -F: 'NR==1{print $2}' "$SESSION_FILE")
  TOTAL_OUT=$(awk -F: 'NR==2{print $2}' "$SESSION_FILE")
  TOOL_COUNT=$(awk -F: 'NR==3{print $2}' "$SESSION_FILE")
else
  TOTAL_IN=0; TOTAL_OUT=0; TOOL_COUNT=0
fi

TOTAL_IN=$((TOTAL_IN + IN_TOK))
TOTAL_OUT=$((TOTAL_OUT + OUT_TOK))
TOOL_COUNT=$((TOOL_COUNT + 1))

# Save updated session totals
printf "in:%d\nout:%d\ntools:%d\n" "$TOTAL_IN" "$TOTAL_OUT" "$TOOL_COUNT" > "$SESSION_FILE"

# Calculate cost (bash only does integers, use python for float math)
COST=$(python3 -c "
total_in  = $TOTAL_IN
total_out = $TOTAL_OUT
cost = (total_in / 1_000_000 * 3.00) + (total_out / 1_000_000 * 15.00)
print(f'\${cost:.4f}')
" 2>/dev/null)

# Append to session log (one line per tool call)
echo "$(date '+%Y-%m-%d %H:%M:%S') | session=${SESSION_ID:0:8} | tool=$TOOL_NAME | session_total=${TOTAL_IN}in+${TOTAL_OUT}out tokens | est_cost=$COST" >> "$LOG_FILE"

exit 0
