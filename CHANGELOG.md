# Changelog

All notable changes to **RUN STITCHCODE** are written down in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Plain words:** "Added" means new things, "Fixed" means repairs,
> "Changed" means things that work differently now, and "Security" means
> safety repairs.

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

[1.0.0]: https://github.com/hateem2121/stitchcode/releases/tag/v1.0.0
