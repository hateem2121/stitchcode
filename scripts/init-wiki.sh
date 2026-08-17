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

REPO="hateem2121/stitchcode"
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
