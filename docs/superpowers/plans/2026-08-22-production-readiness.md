# StitchCode Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish enterprise-grade production readiness for StitchCode across Web (GitHub Pages/PWA), Docker/GHCR, and Desktop (Electron for macOS, Windows, Linux) by standardizing repository identity, installing an automated test suite with Vitest, synchronizing multi-platform CI/CD release workflows, enhancing the intelligent Auto-Fix engine, and optimizing bundle chunking.

**Architecture:** Client-side React 19 SPA running in Vite with strict offline invariants and AES-256 encrypted local storage. Vitest executes unit/integration tests against payload, crypto, QR mathematical rendering, and decode logic. Multi-platform Electron builders package DMG/ZIP, EXE, and AppImage/DEB binaries in GitHub Actions.

**Tech Stack:** React 19, TypeScript 5.9, Vite 6, Tailwind CSS v4, Vitest, Testing Library, Electron 43, electron-builder, Nginx, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-production-readiness-design.md`

## Global Constraints

- Canonical repository is `RUN-APPAREL/stitchcode`.
- 100% offline invariant: No external telemetry, runtime network fetches, or analytics.
- Strict CSP headers and DOMPurify SVG sanitization for all outputs.
- Test runner must pass in CI on Node 22 and Node 24.
- Electron release targets must match uploaded artifacts in release workflow.

---

### Task 1: Repository Canonicalization & Identity Standardisation

**Files:**
- Modify: `package.json:1-12`
- Modify: `index.html:15-35`
- Modify: `.github/workflows/docker.yml:25-35`
- Modify: `docker-compose.yml:1-15`
- Modify: `README.md:1-50`
- Modify: `DOWNLOAD.md:1-50`
- Modify: `DEPLOYMENT_SUMMARY.md:1-70`
- Modify: `GITHUB_DEPLOYMENT_GUIDE.md:1-50`
- Modify: `docs/PRODUCTION_CHECKLIST.md:1-40`

**Interfaces:**
- Produces: Uniform `RUN-APPAREL/stitchcode` repository paths, `ghcr.io/run-apparel/stitchcode` docker image tags, and `https://RUN-APPAREL.github.io/stitchcode/` URLs across the codebase.

- [ ] **Step 1: Update package.json repository & homepage metadata**
- [ ] **Step 2: Update index.html meta and OpenGraph tags**
- [ ] **Step 3: Update GitHub Actions docker.yml and docker-compose.yml image paths**
- [ ] **Step 4: Synchronize all documentation and markdown links**
- [ ] **Step 5: Verify build with updated metadata**
  Run: `npm run build`
  Expected: Clean build with code 0

---

### Task 2: Automated Testing Infrastructure (Vitest & Testing Library)

**Files:**
- Modify: `package.json:13-25, 43-57`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `npm test` and `npm run test:run` commands powered by Vitest, jsdom, and `@testing-library/jest-dom`.

- [ ] **Step 1: Install Vitest and test utilities**
  Run: `npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/jsdom`
- [ ] **Step 2: Create test setup file `src/test/setup.ts`**
- [ ] **Step 3: Create `vitest.config.ts` with jsdom environment and test aliases**
- [ ] **Step 4: Update `package.json` scripts to add `test` and `test:run`**
- [ ] **Step 5: Verify test runner executes**
  Run: `npm run test:run`
  Expected: Vitest initializes cleanly

---

### Task 3: Core Engine Unit Tests (Payloads, Crypto, QR Math, Logo Grid)

**Files:**
- Create: `src/lib/payloads.test.ts`
- Create: `src/lib/crypto.test.ts`
- Create: `src/lib/qr.test.ts`
- Create: `src/lib/decode.test.ts`
- Create: `src/lib/useLogoGrid.test.ts`

**Interfaces:**
- Consumes: `buildPayload`, `summarize` from `src/lib/payloads.ts`
- Consumes: `secureStorageSet`, `secureStorageGet`, `encrypt`, `decrypt` from `src/lib/crypto.ts`
- Consumes: `createMatrix`, `renderSVG`, `contrastRatio`, `luminance`, `logoRegionModules` from `src/lib/qr.ts`
- Consumes: `decodeQR` from `src/lib/decode.ts`
- Consumes: `logoToGrid` from `src/lib/qr.ts` and helper hooks

- [ ] **Step 1: Write and verify `src/lib/payloads.test.ts` (all 7 payload types & validation)**
- [ ] **Step 2: Write and verify `src/lib/crypto.test.ts` (AES-256-GCM, PBKDF2, tamper detection, quota pruning)**
- [ ] **Step 3: Write and verify `src/lib/qr.test.ts` (matrix math, contrast calculations, SVG sanitization)**
- [ ] **Step 4: Write and verify `src/lib/decode.test.ts` (round-trip decode tests)**
- [ ] **Step 5: Run full test suite and confirm 100% pass**
  Run: `npm run test:run`
  Expected: All unit test suites pass

---

### Task 4: UI & Auto-Fix Component Tests and Logic Hardening

**Files:**
- Modify: `src/App.tsx:640-670`
- Create: `src/App.test.tsx`
- Create: `src/components/PreviewPanel.test.tsx`

**Interfaces:**
- Consumes: `autoFix` logic in `src/App.tsx`
- Produces: Enhanced `autoFix` handling contrast ratio restoration, EC boost (`H`/`Q`), and logo safe-scaling with user feedback.

- [ ] **Step 1: Write tests for intelligent Auto-Fix in `src/App.test.tsx`**
- [ ] **Step 2: Implement full intelligent AutoFix in `src/App.tsx` to handle contrast, EC elevation, and logo boundaries**
- [ ] **Step 3: Write smoke tests for `PreviewPanel` and `ContentForms`**
- [ ] **Step 4: Run test suite to verify AutoFix and UI tests pass**
  Run: `npm run test:run`
  Expected: All tests pass

---

### Task 5: Multi-Platform Release Pipeline & CI Integration

**Files:**
- Modify: `package.json:58-90`
- Modify: `.github/workflows/ci.yml:30-45`
- Modify: `.github/workflows/release.yml:30-80`

**Interfaces:**
- Produces: Synchronized electron packaging matrix:
  - macOS: `dmg`, `zip`
  - Windows: `nsis` (exe)
  - Linux: `AppImage`, `deb`
- Produces: Automated `npm test` step in CI workflow before build.

- [ ] **Step 1: Update `package.json` build config to include DMG and ZIP for macOS, NSIS for Windows, AppImage & DEB for Linux**
- [ ] **Step 2: Update `.github/workflows/release.yml` artifact upload paths to match generated binaries**
- [ ] **Step 3: Update `.github/workflows/ci.yml` to run `npm test` alongside typecheck and build**
- [ ] **Step 4: Verify local electron build configuration**
  Run: `npm run typecheck && npm run build`
  Expected: Success with code 0

---

### Task 6: Bundle Optimization & Final Production Verification

**Files:**
- Modify: `vite.config.js:15-26`
- Modify: `public/sw.js:10-16`

**Interfaces:**
- Produces: Optimized vendor chunking in `dist/assets/` avoiding single monolithic chunk warnings.

- [ ] **Step 1: Add Rollup manualChunks configuration to `vite.config.js`**
- [ ] **Step 2: Run production build and inspect chunk distribution**
  Run: `npm run build`
  Expected: No chunks exceed warning threshold, separate clean vendor bundles.
- [ ] **Step 3: Update Service Worker version to v1.2.0**
- [ ] **Step 4: Run full verification checklist: typecheck, build, and test**
  Run: `npm run typecheck && npm test:run && npm run build`
  Expected: 100% PASS across all steps.
