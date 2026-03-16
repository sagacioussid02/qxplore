#!/bin/bash
# Install git hooks from scripts/hooks/ into .git/hooks/
# Run once after cloning: ./scripts/setup-hooks.sh

set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
HOOKS_SRC="$ROOT/scripts/hooks"
HOOKS_DEST="$ROOT/.git/hooks"

for hook in "$HOOKS_SRC"/*; do
  name=$(basename "$hook")
  dest="$HOOKS_DEST/$name"
  cp "$hook" "$dest"
  chmod +x "$dest"
  echo "Installed: .git/hooks/$name"
done

echo ""
echo "Git hooks installed. Direct pushes to main/develop are now blocked."
