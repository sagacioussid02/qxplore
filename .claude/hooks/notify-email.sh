#!/bin/bash
# Sends an email summary when Claude finishes a session.
# Runs on the Stop hook event.
#
# Required env vars (add to ~/.zshrc or ~/.bashrc):
#   CLAUDE_NOTIFY_TO       - recipient email (e.g. you@gmail.com)
#   CLAUDE_GMAIL_USER      - sender Gmail address (e.g. sender@gmail.com)
#   CLAUDE_GMAIL_APP_PASS  - Gmail App Password (16-char, no spaces)
#                            Generate at: https://myaccount.google.com/apppasswords
#
# Gmail App Password setup (one-time):
#   1. Go to myaccount.google.com/apppasswords
#   2. Select "Other (custom name)" → type "Claude Code"
#   3. Copy the 16-character password → set as CLAUDE_GMAIL_APP_PASS

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('session_id','unknown'))" 2>/dev/null)

# Check required env vars
if [[ -z "$CLAUDE_NOTIFY_TO" || -z "$CLAUDE_GMAIL_USER" || -z "$CLAUDE_GMAIL_APP_PASS" ]]; then
  echo "⚠️  notify-email: missing env vars. Set CLAUDE_NOTIFY_TO, CLAUDE_GMAIL_USER, CLAUDE_GMAIL_APP_PASS" >&2
  exit 0
fi

HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
PROJECT_NAME=$(basename "$PROJECT_ROOT")
SESSION_SHORT="${SESSION_ID:0:8}"

# Read files edited this session from audit.log
AUDIT_LOG="$HOOK_DIR/../audit.log"
if [[ -f "$AUDIT_LOG" ]]; then
  FILES_EDITED=$(grep "$SESSION_SHORT\|$(date '+%Y-%m-%d')" "$AUDIT_LOG" 2>/dev/null | awk '{print $NF}' | sort -u | head -20)
  FILE_COUNT=$(echo "$FILES_EDITED" | grep -c . 2>/dev/null || echo 0)
else
  FILES_EDITED="(audit log not available)"
  FILE_COUNT=0
fi

# Read session cost from cost tracker
SESSION_FILE="/tmp/claude_session_${SESSION_ID}.cost"
if [[ -f "$SESSION_FILE" ]]; then
  TOTAL_IN=$(awk -F: 'NR==1{print $2}' "$SESSION_FILE")
  TOTAL_OUT=$(awk -F: 'NR==2{print $2}' "$SESSION_FILE")
  TOOL_COUNT=$(awk -F: 'NR==3{print $2}' "$SESSION_FILE")
  COST=$(python3 -c "
cost = ($TOTAL_IN / 1_000_000 * 3.00) + ($TOTAL_OUT / 1_000_000 * 15.00)
print(f'\${cost:.4f}')
" 2>/dev/null)
else
  TOTAL_IN=0; TOTAL_OUT=0; TOOL_COUNT=0; COST="\$0.0000"
fi

# Skip sending if nothing was done this session
if [[ "$TOOL_COUNT" -lt 3 ]]; then
  exit 0
fi

# Build email body
SUBJECT="Claude Code finished — $PROJECT_NAME ($FILE_COUNT files changed)"
BODY="Claude Code session completed.

Project:   $PROJECT_NAME
Session:   $SESSION_SHORT
Time:      $(date '+%Y-%m-%d %H:%M:%S')

── Activity ──────────────────────────
Tool calls:     $TOOL_COUNT
Files changed:  $FILE_COUNT
Est. tokens:    ${TOTAL_IN} in + ${TOTAL_OUT} out
Est. cost:      $COST

── Files Edited ──────────────────────
$FILES_EDITED

──────────────────────────────────────
Review changes: cd $PROJECT_ROOT && git diff HEAD~1
"

# Send via Gmail SMTP using Python (built-in smtplib, no dependencies)
python3 - <<PYEOF
import smtplib
from email.mime.text import MIMEText
import os

msg = MIMEText("""$BODY""")
msg['Subject'] = """$SUBJECT"""
msg['From']    = os.environ['CLAUDE_GMAIL_USER']
msg['To']      = os.environ['CLAUDE_NOTIFY_TO']

try:
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(os.environ['CLAUDE_GMAIL_USER'], os.environ['CLAUDE_GMAIL_APP_PASS'])
        smtp.send_message(msg)
    print("✅ notify-email: session summary sent to $CLAUDE_NOTIFY_TO", flush=True)
except Exception as e:
    print(f"⚠️  notify-email: failed to send email — {e}", flush=True)
PYEOF

exit 0
