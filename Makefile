# ------------------------------------------------------------------
# RUN STITCHCODE — one-command helpers
#
#   make dev          run the studio locally
#   make build        production build (portable, relative paths)
#   make serve-dist   open the built studio in the browser
#   make wiki-init    publish wiki/*.md to the GitHub wiki
#   make release      tag v1.0.0 and push → robots build Release + Docker
#   make docker-run   run the published image on localhost:8080
# ------------------------------------------------------------------
SHELL := /bin/bash
VERSION ?= 1.0.0

.PHONY: dev build serve-dist wiki-init release docker-run check

dev:
	npm run dev

build:
	npm run build -- --base=./

# Serves dist/ so the download-and-use path works exactly as documented.
serve-dist: build
	@command -v npx >/dev/null && npx --yes serve -l 4173 dist || python3 -m http.server 4173 --directory dist

check:
	npm run typecheck
	npm run build -- --base=./

wiki-init:
	bash scripts/init-wiki.sh

# Creates (or reuses) the release tag and pushes it — the Release and
# Docker workflows do the rest automatically.
release:
	@git rev-parse "v$(VERSION)" >/dev/null 2>&1 \
	  && echo "→ tag v$(VERSION) already exists — pushing it" \
	  || { echo "→ tagging v$(VERSION)"; git tag -a "v$(VERSION)" -m "RUN STITCHCODE v$(VERSION)"; }
	git push origin "v$(VERSION)"
	@echo ""
	@echo "✓ Tag pushed. Watch the robots:"
	@echo "  https://github.com/RUN-APPAREL/stitchcode/actions"

docker-run:
	docker run -d -p 8080:80 --name stitchcode ghcr.io/run-apparel/stitchcode:$(VERSION)
	@echo "✓ Studio running → http://localhost:8080"
