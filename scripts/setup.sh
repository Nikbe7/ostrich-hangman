#!/bin/sh
# Setup script: Install git hooks for this project.
# Run this once after cloning: sh scripts/setup.sh

REPO_ROOT=$(git rev-parse --show-toplevel)
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SCRIPTS_HOOKS_DIR="$REPO_ROOT/scripts/hooks"

echo "Installing git hooks..."

for hook in "$SCRIPTS_HOOKS_DIR"/*; do
    hook_name=$(basename "$hook")
    target="$HOOKS_DIR/$hook_name"
    cp "$hook" "$target"
    chmod +x "$target"
    echo "  ✓ Installed: $hook_name"
done

echo ""
echo "✅ Git hooks installed successfully!"
echo "   Tests will now run automatically before every 'git push'."
