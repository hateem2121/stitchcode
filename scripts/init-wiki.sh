#!/usr/bin/env bash
# ------------------------------------------------------------------
# Wiki initialiser — copies the illustrated wiki pages from this repo
# into the GitHub wiki repository (stitchcode.wiki.git).
#
# One-time prerequisite (GitHub can only create the wiki repo from the
# browser): open the repo → Wiki tab → "Create the first page" → save.
# Then run:   make wiki-init   (or ./scripts/init-wiki.sh)
# ------------------------------------------------------------------
set -euo pipefail

REPO="${1:-RUN-APPAREL/stitchcode}"
if [ -z "${1:-}" ] && git config --get remote.origin.url >/dev/null 2>&1; then
  ORIGIN_URL="$(git config --get remote.origin.url)"
  if [[ "$ORIGIN_URL" =~ github\.com[:/]([^/]+/[^/.]+)(\.git)?$ ]]; then
    REPO="${BASH_REMATCH[1]}"
  fi
fi
WIKI_URL="https://github.com/${REPO}.wiki.git"
TMP="$(mktemp -d)"

echo "→ cloning ${WIKI_URL}"
if ! git clone "$WIKI_URL" "$TMP/wiki" 2>/dev/null; then
  echo ""
  echo "✗ The wiki repository doesn't exist yet."
  echo "  1. Open https://github.com/${REPO}/wiki"
  echo "  2. Click “Create the first page” and save anything."
  echo "  3. Re-run this script."
  exit 1
fi

echo "→ copying wiki/*.md"
cp wiki/*.md "$TMP/wiki/"

cd "$TMP/wiki"
git add -A
if git diff --cached --quiet; then
  echo "→ nothing new to publish — wiki is already up to date."
else
  git -c user.name="stitchcode-bot" -c user.email="bot@users.noreply.github.com" \
    commit -m "docs(wiki): sync illustrated wiki pages"
  echo "→ pushing"
  git push origin HEAD
  echo ""
  echo "✓ Wiki published → https://github.com/${REPO}/wiki"
fi

rm -rf "$TMP"
