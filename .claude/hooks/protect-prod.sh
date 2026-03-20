#!/bin/bash
# Blocks Claude from directly editing Terraform state files or prod config files.
# Exit 2 + stderr message = tool call is denied and reason is shown to Claude.

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null)

if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]] && [[ -n "$FILE_PATH" ]]; then
  # Block Terraform state files
  if [[ "$FILE_PATH" == *"terraform.tfstate"* ]]; then
    echo "🔒 Blocked by .claude/hooks/protect-prod.sh: Direct edits to Terraform state files are not allowed. State is managed by Terraform — run 'terraform apply' instead." >&2
    exit 2
  fi

  # Block prod-specific override/variable files
  if [[ "$FILE_PATH" == *"prod.tfvars"* ]] || [[ "$FILE_PATH" == *"prod.auto.tfvars"* ]]; then
    echo "🔒 Blocked by .claude/hooks/protect-prod.sh: Direct edits to prod Terraform variable files are not allowed. Ask the user to update prod secrets manually." >&2
    exit 2
  fi

  # Block GitHub Actions prod environment secrets/config
  if [[ "$FILE_PATH" == *"prod"* && "$FILE_PATH" == *".env"* ]]; then
    echo "🔒 Blocked by .claude/hooks/protect-prod.sh: Direct edits to prod environment files are not allowed." >&2
    exit 2
  fi
fi

exit 0
