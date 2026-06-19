#!/usr/bin/env bash
set -euo pipefail

# Safe helper to try to stage, commit, pull (rebase) from origin, and push.
# Usage: ./scripts/fix-git-push.sh ["Commit message"]

msg=${1:-"chore: commit from helper script"}

echo "Working directory: $(pwd)"
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -z "$branch" ]; then
  echo "Not in a git repo or branch cannot be determined. Aborting."
  exit 1
fi

echo "Current branch: $branch"

# Show status
git status --porcelain=2 --branch

# Stage all changes
read -p "Stage all changes (git add -A)? [y/N] " STAGE
if [[ "$STAGE" =~ ^[Yy]$ ]]; then
  git add -A
  echo "Staged all changes."
else
  echo "Skipping staging."
fi

# Check if there is anything to commit
if git diff --cached --quiet; then
  echo "No staged changes to commit."
else
  read -p "Create commit with message: '$msg'? [y/N] " DO_COMMIT
  if [[ "$DO_COMMIT" =~ ^[Yy]$ ]]; then
    git commit -m "$msg" || (echo "Commit failed." && exit 1)
    echo "Committed changes."
  else
    echo "Skipping commit. If you want to push commits, please commit first." 
  fi
fi

# Ensure remote exists
remote=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$remote" ]; then
  echo "Remote 'origin' not configured. Please set remote and try again. Example:"
  echo "  git remote add origin <url>"
  exit 1
fi

# Fetch and rebase
echo "Fetching from origin..."
git fetch origin --prune

echo "Attempting to rebase onto origin/$branch..."
if git rev-parse --verify origin/$branch >/dev/null 2>&1; then
  if git pull --rebase origin "$branch"; then
    echo "Rebased successfully."
  else
    echo "Rebase failed — resolve conflicts manually, then run 'git rebase --continue'. Aborting."
    exit 1
  fi
else
  echo "No upstream branch origin/$branch exists. Will attempt to push as new branch."
fi

# Push changes
echo "Pushing to origin $branch..."
if git push origin "$branch"; then
  echo "Push successful."
else
  echo "Push failed. Possible causes: authentication, non-fast-forward, or branch protection."
  echo "Run the following commands to inspect and attempt fixes:"
  echo "  git status"
  echo "  git log --oneline --graph --decorate -n 10"
  echo "  git remote -v"
  echo "To authenticate with GitHub CLI: 'gh auth login' or ensure your SSH keys/credentials are configured."
  exit 1
fi

exit 0
