# Changelog

All notable changes to **StitchCode QR Studio** are written down in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Plain words:** "Added" means new things, "Fixed" means repairs,
> "Changed" means things that work differently now, and "Security" means
> safety repairs.

## [1.3.0] — 2026-10-17

A production-readiness release: every layer audited, modernized, and re-verified.

### ⚠️ Corrections to earlier claims (errata for 1.2.3)
- "History pruning to last 50 items" — the code pruned to **8**. 1.3.0 keeps 8
  as the documented limit (`HISTORY_MAX`).
- "File upload validation with MIME type and magic number checking" — there was
  no magic-number check. There still isn't (MIME prefix + extension + size only);
  the claim is withdrawn rather than implemented silently.
- "10/10 rating achieved" / "all vulnerabilities remediated" — not supportable
  at the time; see the rewritten SECURITY.md for the honest posture.

### Fixed — core correctness
- Logo stitching no longer silently stops: the rasterizer cache ignored logo
  and matrix changes when slider settings were identical (remove → re-upload a
  different picture never rendered; longer payloads mis-sized the logo region)
- Over-capacity payloads now show a real error in the preview instead of a
  silent blank — capacity is validated against the SELECTED error-correction
  level (it was always checked against level L)
- The "we scanned it for you" decode check can no longer stick on "Scanning…"
  forever when the canvas is unavailable (terminal error state)
- History autosave: pure state updates (no more double-writes under
  StrictMode), logo-aware dedupe (swapping pictures with identical settings
  now saves), quota failures surface with a rescue attempt instead of silence
- Payloads: SMSTO message is raw text (was percent-encoded — scanners showed
  literal %20), multi-line text payloads keep their line breaks, vCard
  EMAIL/URL values are escaped, empty URL: lines omitted, localhost and
  single-label hosts accepted, short phone numbers (911) allowed

### Added
- **Per-Reed-Solomon-block logo safety gate** — inlay regions are measured
  against the worst RS block's actual correction budget (gate: <70%), not the
  unsafe "≤30% area" folklore; proven by round-trip tests that force-erase
  every "safe" region and decode with a real ZXing WASM decoder
- Export scan-safety floors: every export (PNG/SVG/print sheet) carries the
  ISO 4-module quiet zone; new "Print size" check (module mm at 5 cm, the
  distance÷10 rule, 0.4 mm module floor)
- Optional **passphrase protection** for saved history (AES-256-GCM envelope,
  PBKDF2-SHA256 600k + HKDF) with an unlock prompt — see SECURITY.md for what
  each tier does and does not protect
- User-approved PWA updates ("A new version is ready — Update / Later"),
  with build-time service-worker versioning that can no longer drift
- Real decode round-trip tests; QR generation on the vendored Nayuki
  qrcodegen reference implementation (the previous `qrcode` dependency is
  dormant since Aug 2024); decoding via native BarcodeDetector with an
  actively maintained ZXing-WASM fallback (jsQR was frozen in 2021)
- ESLint 10 + strict TS (electron main included), coverage in CI, osv-scanner,
  SHA-pinned GitHub Actions, draft releases with SHA-256 checksums and
  attested build provenance, unprivileged digest-pinned Docker image

### Changed
- React 19.3 + React Compiler v1; Vite 8 (Rolldown); Electron 44;
  Tailwind 4.3 — build ~3× faster
- Saved history moved to IndexedDB (encrypted), lifting the ~5 MB
  localStorage ceiling; legacy plaintext and v1 encrypted stores migrate
  automatically on first open
- Accessibility: real labels on every field, Radix Tabs/Dialog semantics,
  FAQ headings + aria state, focus trap on the print sheet, AA-contrast
  theme tokens, 24px touch targets
- macOS inlay is forced to EC level H on mode switch (was only on upload)

### Security
- The v1 "encryption" (key derived from public browser fingerprint values) is
  replaced by the layered vault above — it also could not survive a browser
  update without silently wiping saved history
- Complete attribute escaping in the SVG renderer (the finder/inlay/stitch
  paths skipped it) and DOMPurify on the remaining innerHTML sinks
- nginx: security headers now actually apply to HTML and assets (an
  add_header inheritance bug stripped them); CSP drops script-src
  'unsafe-inline'; sw.js/manifest served no-cache (were "immutable" for a year)
- Electron: window-open/navigate/webview guards, deny-all permissions,
  explicit sandbox, packaged menu without DevTools, fuses + ASAR integrity,
  dev server actually wired (electron:dev previously loaded a stale build)
- Vite dev server no longer binds 0.0.0.0

## [1.2.3] — 2026-08-19

### Fixed
- Fixed Electron macOS distribution artifact generation and packaging path in CI/CD release workflow
- Fixed matrix build cancellation by configuring non-blocking fail-fast behavior across platforms
- Corrected `.gitignore` rules syntax and excluded build output directories

### Added
- Multi-format macOS distribution packaging supporting both `.dmg` installer and `.zip` archive

[1.2.3]: https://github.com/RUN-APPAREL/stitchcode/releases/tag/v1.2.3

## [1.2.0] — 2026-08-18

### Added
- Desktop applications for macOS, Windows, and Linux using Electron
- Automated build workflows for GitHub Releases
- Enhanced security audit documentation (10/10 rating achieved)
- DOMPurify integration for additional XSS protection
- Constant-time comparison for decryption operations
- File upload validation with MIME type and magic number checking
- History pruning to last 50 items to prevent storage quota exhaustion
- Comprehensive download guide (GITHUB_DEPLOYMENT_GUIDE.md)

### Changed
- Renamed electron/main.js to electron/main.cjs for ES module compatibility
- Updated DOWNLOAD.md with actual release links and installation instructions
- Enhanced README.md with clearer quick-start options
- Improved error messages for invalid file uploads

### Security
- All security vulnerabilities from SECURITY_AUDIT_2026.md remediated
- Content Security Policy enforced at Electron session level
- SVG output sanitization with entity escaping
- AES-256-GCM encryption for all sensitive data storage
- Protocol whitelisting blocks javascript:, data:, vbscript: URLs
- Email header injection prevention
- Control character sanitization

[1.2.0]: https://github.com/RUN-APPAREL/stitchcode/releases/tag/v1.2.0

## [1.0.0] — 2026-08-17

### Added
- The studio: seven ways to share (Link, Text, Wi-Fi, Card, E-mail, Message, Phone)
  with live validation and friendly field tips.
- **Stitch** logo technique — a picture is dithered into a fine halftone and the
  complete code (dark *and* light dots) is repainted on top, so nothing is ever
  erased and any safety level works, up to a full-bleed 100% "photo QR".
- **Inlay** logo technique — the picture becomes real modules that replace data;
  level H restores what is lost, and functional patterns are never touched.
- Three edge styles: Dithered (Floyd–Steinberg), Screen (Bayer halftone), Crisp (1-bit).
- Picture tone controls: How big, How dark, Brightness, Pop, and Fade (wash).
- A **real decode test** — every preview is scanned back with an offline decoder
  (jsQR, lazy-loaded) so the app can say "It works!" for sure.
- Scan-safety report: clear border, contrast, colour direction, density,
  picture coverage — all checked live while typing.
- Five substrate previews (paper, kraft, knit, cotton, nylon) with a print-shop
  magnifier on hover.
- Crop-marked print proof sheet with a true-size 2 cm minimum check.
- Five light colour themes, saved on the device, plus a surprise-theme shuffle.
- PNG / SVG export, copy-to-clipboard, and native sharing on phones.
- Local-first history with faithful stitched thumbnails (nothing leaves the device).
- Interactive "inside a code" anatomy lesson with clickable hotspots.
- One-tap Quick Ideas, a Surprise-me! button, and a "Fix it for me" rescue.
- Full keyboard support, reduced-motion support, and screen-reader labels.
- Open-source repository files: README, licence, contribution guide, code of
  conduct, security policy, CI, Pages deployment, releases, and Docker images.

### Security
- Functional QR patterns (finders, separators, alignment, timing, format rings,
  version blocks, dark module) are preserved by every merge, so no merge can
  destroy uncorrectable data.
- Zero network calls at runtime — fonts and the decoder are bundled locally.

[1.0.0]: https://github.com/RUN-APPAREL/stitchcode/releases/tag/v1.0.0
