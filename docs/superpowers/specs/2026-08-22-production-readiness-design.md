# Production Readiness Design Specification

**Document Date:** 2026-08-22  
**Target Repository:** `https://github.com/RUN-APPAREL/stitchcode`  
**Application:** StitchCode QR Studio v1.2.0

---

## 1. Executive Summary

StitchCode is a privacy-first, 100% client-side QR Code Studio featuring logo stitching and substrate proofing. This specification establishes enterprise-grade production readiness across Web (GitHub Pages & PWA), Docker/GHCR containerization, and Desktop (Electron for macOS, Windows, Linux).

---

## 2. Global Constraints & Standards

- **Canonical Repository:** `RUN-APPAREL/stitchcode` across all documentation, metadata, workflows, and container registries.
- **Node.js Engines:** Support Node 22 (Maintenance LTS) and Node 24 (Active LTS in 2026).
- **Privacy & Offline Invariant:** The client-side application must never initiate external network requests or telemetry. All generation, rasterization, encryption, and decode testing must remain strictly local in the browser / Electron runtime.
- **Security Baseline:** Maintain 10/10 OWASP client-side security rating with strict CSP headers, DOMPurify SVG sanitization, and constant-time PBKDF2/AES-GCM encryption for local history.
- **Testing Standard:** 100% automated test execution in CI (`npm test`), covering payloads, crypto, QR math, logo algorithms, decoding round-trips, and UI components.

---

## 3. Architecture & Key Subsystems

### 3.1 Repository Canonicalization & Identity Standardisation
- **Package Metadata**: Standardize `homepage`, `author`, `repository` in `package.json` to `https://github.com/RUN-APPAREL/stitchcode`.
- **HTML Meta Tags**: Update OpenGraph, Twitter card images, and URLs in `index.html` to point to `https://RUN-APPAREL.github.io/stitchcode/`.
- **Documentation**: Synchronize `README.md`, `DOWNLOAD.md`, `DEPLOYMENT_SUMMARY.md`, `GITHUB_DEPLOYMENT_GUIDE.md`, `docs/PRODUCTION_CHECKLIST.md`, and `wiki/` markdown files.
- **Docker Registry**: Standardize image paths in `.github/workflows/docker.yml` and `docker-compose.yml` to `ghcr.io/run-apparel/stitchcode`.

### 3.2 Automated Testing Suite
- **Framework**: Vitest + jsdom + `@testing-library/react` + `@testing-library/jest-dom`.
- **Unit & Integration Test Suites**:
  1. `src/lib/payloads.test.ts`: Verification of all 7 payload types (URL, Text, WiFi, vCard, Email, SMS, Crypto/UPI).
  2. `src/lib/crypto.test.ts`: Verification of AES-256-GCM encryption/decryption, PBKDF2 key derivation, legacy migration, tamper detection, and 50-item storage quota pruning.
  3. `src/lib/qr.test.ts`: Verification of matrix generation, WCAG contrast ratio calculations, luminance, SVG rendering safety, and canvas export helpers.
  4. `src/lib/decode.test.ts`: Round-trip scan validation using `jsQR`.
  5. `src/lib/useLogoGrid.test.ts`: Logo aspect ratio, thresholding, and dithering calculations.
  6. `src/App.test.tsx` & Component Tests: Smoke tests for UI rendering, tab navigation, theme persistence, and AutoFix behavior.
- **CI Integration**: Add `npm test` to `.github/workflows/ci.yml`.

### 3.3 Multi-Platform Packaging & Release Workflows
- **Electron Build Targets**:
  - **macOS**: DMG (`.dmg`) + ZIP (`.zip`).
  - **Windows**: NSIS Setup (`.exe`).
  - **Linux**: AppImage (`.AppImage`) + Debian Package (`.deb`).
- **Release Action Synchronization**:
  - Update `.github/workflows/release.yml` artifact upload paths to match exact electron-builder outputs for all three operating systems.
  - Ensure release jobs trigger on version tags (`v*`) and attach all binaries to GitHub Releases.

### 3.4 Intelligent Auto-Fix & Scan Resilience Engine
- **Failure Diagnostics**:
  1. Contrast ratio $< 4.5:1$ or inverted polarity (light-on-dark) $\rightarrow$ restore safe high-contrast palette (`#1c1c1a` on `#ffffff`).
  2. Insufficient error correction with logos $\rightarrow$ auto-elevate EC level to `H` (30% recovery) or `Q` (25% recovery).
  3. Logo region overreach $\rightarrow$ constrain logo scale to safe threshold ($\le 0.28$ for inlay, optimize fade/halftone for stitch).
- **User Feedback**: Descriptive toast notifications detailing the exact parameters adjusted to achieve decode safety.

### 3.5 Frontend Performance & Bundle Chunking
- **Vite Configuration**: Configure `build.rollupOptions.output.manualChunks` in `vite.config.js` to split vendor dependencies:
  - `vendor-react`: `react`, `react-dom`
  - `vendor-motion`: `motion`
  - `vendor-ui`: `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `lucide-react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
  - `vendor-qr`: `qrcode`, `jsqr`, `dompurify`
- Guarantees chunk sizes stay well within Vite limits and optimizes long-term asset caching.
