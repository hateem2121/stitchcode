# Task 1 Brief: Repository Canonicalization & Identity Standardisation

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `.github/workflows/docker.yml`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Modify: `DOWNLOAD.md`
- Modify: `DEPLOYMENT_SUMMARY.md`
- Modify: `GITHUB_DEPLOYMENT_GUIDE.md`
- Modify: `docs/PRODUCTION_CHECKLIST.md`

**Requirements:**
1. Update `package.json`:
   - `homepage`: `"https://github.com/RUN-APPAREL/stitchcode"`
   - `repository`: `{"type": "git", "url": "https://github.com/RUN-APPAREL/stitchcode.git"}`
   - `author`: `{"name": "RUN-APPAREL", "email": "support@stitchcode.com"}`
2. Update `index.html`:
   - OpenGraph `og:url` to `https://RUN-APPAREL.github.io/stitchcode/`
   - `og:image` and `twitter:image` to `https://raw.githubusercontent.com/RUN-APPAREL/stitchcode/main/docs/assets/banner.svg`
3. Update `.github/workflows/docker.yml` and `docker-compose.yml`:
   - Set docker repository / image references to `ghcr.io/run-apparel/stitchcode`
4. Update all documentation references (README.md, DOWNLOAD.md, DEPLOYMENT_SUMMARY.md, GITHUB_DEPLOYMENT_GUIDE.md, docs/PRODUCTION_CHECKLIST.md):
   - Replace legacy `RUN-APPAREL` and `stitchcode/stitchcode-qr-studio` references with canonical `RUN-APPAREL/stitchcode` and `RUN-APPAREL.github.io/stitchcode`.
5. Run `npm run build` to verify nothing is broken.
6. Commit changes with message: `chore: canonicalize repository identity to RUN-APPAREL/stitchcode`.
