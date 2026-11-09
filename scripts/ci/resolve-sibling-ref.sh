#!/usr/bin/env bash
# Prints the benefit-be ref to test against: the branch named like the current one if it
# exists there, otherwise main. Usage: resolve-sibling-ref.sh [repo-url]
set -euo pipefail

URL="${1:-https://github.com/${GITHUB_REPOSITORY_OWNER:?set GITHUB_REPOSITORY_OWNER or pass a URL}/benefit-be.git}"
BRANCH="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-main}}"

if [ -n "$BRANCH" ] && git ls-remote --exit-code --heads "$URL" "refs/heads/$BRANCH" > /dev/null 2>&1; then
  REF="$BRANCH"
else
  REF="main"
fi

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  echo "Sibling ref: $REF" >> "$GITHUB_STEP_SUMMARY"
fi
echo "$REF"
