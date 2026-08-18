# Root Cause Analysis Report

## Executive Summary

This report identifies the root causes for three critical issues in the Stitchcode QR Code Studio application:
1. Visual responsiveness issues across desktop and mobile views
2. Auto-fix functionality not working for barcode/QR code scan failures
3. Multiple logo integration issues

---

## Issue 1: Visual Responsiveness (Desktop & Mobile)

### Root Causes Identified:

#### 1.1 Sticky Header Offset Not Responsive
**File:** `/workspace/src/components/PreviewPanel.tsx` (line 276)
```tsx
<div className="sticky top-[92px] space-y-4">
```
**Problem:** Hardcoded `top-[92px]` doesn't adapt to:
- Mobile header height variations
- Dynamic content in header
- Different viewport heights

**Impact:** Preview panel overlaps content or has excessive gap on mobile devices.

#### 1.2 Grid Layout Breakpoint Gaps
**File:** `/workspace/src/App.tsx` (line 676)
```tsx
<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
```
**Problem:** 
- Only two states: stacked (< 1024px) or side-by-side (≥ 1024px)
- No tablet optimization (768px - 1023px range)
- Fixed 400px width for PreviewPanel may overflow on smaller laptops

**Impact:** Suboptimal use of screen real estate on tablets and small laptops.

#### 1.3 Opener Section Mobile Experience
**File:** `/workspace/src/App.tsx` (lines 427, 470)
```tsx
// Line 427
<div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">

// Line 470 - Specimen completely hidden on mobile
<Reveal className="relative hidden justify-center lg:flex">
```
**Problem:**
- Large gaps (`gap-12`, `pb-16`, `pt-14`) waste mobile screen space
- Floating specimen card completely absent on mobile (no alternative visualization)
- No progressive enhancement for intermediate screen sizes

**Impact:** Mobile users miss key visual demonstration of the product.

#### 1.4 QR Live Container Aspect Ratio
**File:** `/workspace/src/index.css` (lines 162-166)
```css
.qr-live svg {
  display: block;
  width: 100%;
  height: auto;
}
```
**Problem:**
- No explicit aspect ratio preservation
- Parent containers with varying widths cause QR code scaling inconsistencies
- Can lead to pixelation or excessive whitespace

**Impact:** QR code appears differently sized across device previews.

#### 1.5 Preview Panel Fixed Max-Width
**File:** `/workspace/src/components/PreviewPanel.tsx` (line 319)
```tsx
<div className="relative w-full max-w-[300px]">
```
**Problem:**
- Fixed `max-w-[300px]` doesn't scale with viewport
- On large desktop monitors, QR preview appears unnecessarily small
- On very small screens, 300px may still be too large relative to content

**Impact:** Inconsistent visual hierarchy across devices.

---

## Issue 2: Auto-Fix Not Working

### Root Causes Identified:

#### 2.1 AutoFix Only Handles Logo Parameters
**File:** `/workspace/src/App.tsx` (lines 646-654)
```tsx
const autoFix = () => {
  setStyle((s) => ({
    ...s,
    logoFade: Math.max(s.logoFade, 0.4),
    logoBrightness: Math.max(s.logoBrightness, 1.5),
    logoContrast: Math.max(s.logoContrast, 1.3),
    logoScale: s.logoMode === "inlay" && s.logoScale > 0.4 ? 0.4 : s.logoScale,
  }));
  toast("info", "We nudged the picture settings — checking again…");
};
```
**Problem:**
- **CRITICAL:** Only modifies logo-related settings
- Does NOT fix common QR scan failures:
  - Low color contrast (fg/bg too similar)
  - Insufficient margin/quiet zone
  - Wrong error correction level
  - Inverted polarity (light on dark)
  - Dot style affecting readability

**Impact:** AutoFix button provides false hope - it cannot fix non-logo-related scan failures.

#### 2.2 AutoFix Button Conditional Display
**File:** `/workspace/src/components/PreviewPanel.tsx` (line 426)
```tsx
{decode.status === "fail" && onAutoFix && (
  <button onClick={onAutoFix}>Fix it for me</button>
)}
```
**Problem:**
- Only appears when `decode.status === "fail"`
- Decode test requires a matrix to exist
- If matrix is null (payload too long, etc.), button never shows
- User gets no auto-fix option for encoding failures

**Impact:** AutoFix unavailable when users need it most (during encoding issues).

#### 2.3 No Barcode Generation Capability
**Problem:**
- Application is QR-code-only (uses `qrcode` library)
- No barcode generation libraries imported
- No barcode type selection in UI
- User expectation mismatch if trying to generate traditional barcodes

**Impact:** If user literally means "barcode" (UPC, EAN, Code128, etc.), the feature doesn't exist.

---

## Issue 3: Logo Integration Issues

### Root Causes Identified:

#### 3.1 Logo Region Calculation Edge Cases
**File:** `/workspace/src/lib/qr.ts` (lines 51-54)
```tsx
export function logoRegionModules(codeSize: number, scale: number): number {
  const n = Math.max(5, Math.min(Math.round(codeSize * scale), codeSize));
  return n >= codeSize ? n : n % 2 === 0 ? n + 1 : n;
}
```
**Problem:**
- When `scale >= 0.9`, `n` approaches `codeSize`
- At 100% scale, logo region equals entire code size
- Even with odd-number adjustment, logo can touch finder pattern separators
- No safety margin enforcement at extreme scales

**Impact:** Logos at high scale percentages risk overlapping critical QR structures.

#### 3.2 Stitch Mode Halftone Boundary Issues
**File:** `/workspace/src/lib/qr.ts` (lines 438-449)
```tsx
for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const mx = ox + Math.floor(i / res);
    const my = ox + Math.floor(j / res);
    if (isFunctional(mx, my, m.size, centers)) continue;
    // ...
  }
}
```
**Problem:**
- Sub-pixel to module mapping via `Math.floor()` creates boundary artifacts
- Halftone pixels near functional pattern edges may partially render
- Anti-aliasing in SVG viewers can blur these boundaries

**Impact:** Visible seams or partial modules at logo region edges.

#### 3.3 Inlay Mode Area-Based Warning Insufficient
**File:** `/workspace/src/components/PreviewPanel.tsx` (lines 176-189)
```tsx
const okLogo = style.ec === "H" && area <= 0.25;
list.push({
  label: "Your picture",
  detail: okLogo ? /* ... */ : "It covers too much of the code",
  pass: okLogo,
});
```
**Problem:**
- Warning based purely on area percentage (25% threshold)
- Doesn't account for:
  - Logo placement relative to data density
  - Actual error correction capacity used
  - Specific QR version capabilities
- A 20% logo in a high-density region may fail while 30% in low-density succeeds

**Impact:** False positives/negatives in scan safety warnings.

#### 3.4 Logo Image Loading Race Conditions
**File:** `/workspace/src/lib/useLogoGrid.ts` (lines 45-79)
```tsx
useEffect(() => {
  const id = ++reqId.current;
  if (!logo || !matrix) {
    setState(IDLE);
    return;
  }
  // ... async logoToGrid call
}, [logo, matrix, p.scale, p.threshold, p.edge, p.bg, p.mode, p.brightness, p.contrast, p.fade]);
```
**Problem:**
- Dependency array has 9 items - any change triggers re-rasterization
- Rapid slider adjustments cause multiple concurrent rasterizations
- While `reqId` guard exists, intermediate states show warnings
- No debouncing for rapid parameter changes

**Impact:** Flickering warnings during logo adjustments, poor UX.

#### 3.5 SVG vs Canvas Renderer Inconsistency
**File:** `/workspace/src/lib/qr.ts` (compare lines 451-477 vs 636-650)
**Problem:**
- SVG renderer uses dot sizes: `0.27` (dots), `0.58` (rounded), `0.62` (square)
- Canvas renderer uses: `s * 0.27`, `s * 0.58`, `s * 0.62`
- Slight floating-point differences in scaling calculations
- Canvas adds `+ 0.5` to rect dimensions for anti-aliasing compensation

**Impact:** Preview (SVG) and export (PNG/SVG) may show subtle visual differences.

#### 3.6 Default Logo Threshold Not Adaptive
**File:** `/workspace/src/components/StylePanel.tsx` (line 74)
```tsx
logoThreshold: 0.5,
```
**Problem:**
- Fixed 50% threshold regardless of image characteristics
- Light/dark images require manual adjustment
- No histogram analysis or auto-threshold suggestion
- Users unfamiliar with thresholding struggle to find optimal setting

**Impact:** Poor initial logo appearance, requires trial-and-error adjustment.

#### 3.7 Missing Logo Format Validation
**File:** `/workspace/src/components/StylePanel.tsx` (lines 124-139)
```tsx
const onLogoFile = (file: File | undefined) => {
  if (!file) return;
  const looksSvg = /\.svg$/i.test(file.name);
  if (!file.type.startsWith("image/") && !looksSvg) {
    toast("error", "That file isn't an image");
    return;
  }
```
**Problem:**
- Only checks MIME type prefix and .svg extension
- Doesn't validate:
  - Minimum resolution (logos < 100×100px become pixelated)
  - Corrupt image files
  - Unsupported formats (WebP, AVIF in older browsers)
  - Vector SVG complexity (extremely complex SVGs slow rendering)

**Impact:** Poor quality logos or performance issues with problematic files.

---

## Recommendations Priority Matrix

| Issue | Severity | Effort | Priority |
|-------|----------|--------|----------|
| 2.1 AutoFix limited scope | High | Medium | P0 |
| 1.1 Sticky header offset | Medium | Low | P0 |
| 3.1 Logo region edge cases | High | Low | P0 |
| 1.3 Mobile opener experience | Medium | Medium | P1 |
| 3.6 Non-adaptive threshold | Medium | Medium | P1 |
| 1.2 Grid breakpoint gaps | Low | Low | P2 |
| 3.4 Logo loading race conditions | Low | Medium | P2 |
| 3.5 SVG/Canvas inconsistency | Low | High | P3 |

---

## Next Steps

1. **Immediate (P0):** Expand AutoFix to handle all scan failure modes
2. **Immediate (P0):** Fix responsive sticky positioning
3. **Immediate (P0):** Add logo region boundary safety checks
4. **Short-term (P1):** Improve mobile visualization for opener section
5. **Short-term (P1):** Implement adaptive logo thresholding
6. **Medium-term (P2):** Add tablet breakpoint optimizations
7. **Medium-term (P2):** Debounce logo parameter changes
