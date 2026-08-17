import { create as createQRCode } from "qrcode";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ECLevel = "L" | "M" | "Q" | "H";
export type DotStyle = "square" | "rounded" | "dots";
export type CornerStyle = "square" | "rounded";

export interface QRRenderOptions {
  ec: ECLevel;
  /** quiet zone, in modules — spec minimum is 4 */
  margin: number;
  fg: string;
  bg: string;
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  /**
   * Logo grid: a binary bitmap (1 = dark) of the uploaded mark.
   * - "inlay": grid is logoN×logoN (one bit per module) and *replaces* the
   *   data modules in the centre — level H restores the data underneath.
   * - "stitch": grid is (logoN·logoRes)² — a sub-module halftone. The image
   *   is laid down first, then the *complete* code is drawn over it, so no
   *   data is ever lost at any error-correction level.
   */
  logoGrid: Uint8Array | null;
  /** logo region width in modules */
  logoN: number;
  /** sub-pixels per module in logoGrid (stitch: 3, inlay: 1) */
  logoRes: number;
  logoMode: "stitch" | "inlay";
  /** logo region as fraction of the code width (0.1 – 0.5) */
  logoScale: number;
}

/**
 * Odd module count for the merged-logo region, centred in the code. Width is
 * capped at 50% → ≤ 25% of the code's area, safely inside level H's ~30%
 * recovery budget (industry guidance caps logos at ≤ 30% of area).
 */
/**
 * Width (in modules) of the logo region for a given fraction of the code.
 *
 * The slider runs the full 10–100% range for both techniques — there is no
 * hard clamp. Scannability is policed by live feedback instead: the
 * "% replaced" readout, the scan-safety checks, and the real decode test all
 * flag an inlay that erases more data than level H can restore. Regions that
 * aren't full-bleed are nudged to an odd width so they sit dead-centre.
 */
export function logoRegionModules(codeSize: number, scale: number): number {
  const n = Math.max(5, Math.min(Math.round(codeSize * scale), codeSize));
  return n >= codeSize ? n : n % 2 === 0 ? n + 1 : n;
}

/** How the mark's tones are reduced to modules. */
export type LogoEdge = "crisp" | "dither" | "ordered";

/**
 * Bayer 4×4 ordered-dither threshold map (row-major, 0–15). Ordered dithering
 * compares each pixel to a position-dependent threshold, yielding the stable,
 * graphic halftone-screen look (vs. Floyd–Steinberg's photographic speckle).
 */
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export interface LogoRasterOptions {
  /**
   * Sub-pixels per module. "Stitch" mode rasterises at 3× the module grid so
   * the halftone is far finer than the code itself; "inlay" works at module
   * resolution (1 bit per module).
   */
  res?: number;
  /** pre-exposure multiplier applied before thresholding (1 = unchanged) */
  brightness?: number;
  /** contrast about the 0.5 midpoint, applied after brightness (1 = unchanged) */
  contrast?: number;
  /**
   * "Wash": mixes luminance toward the stock colour (0 = none, 1 = pure
   * stock). Fading the image toward the field is the single biggest
   * readability lever for full-bleed photo codes — it keeps the modules
   * dominant over busy imagery.
   */
  fade?: number;
}

/**
 * Rasterise an image into an n×n module grid.
 *
 * The whole mark is fitted inside the region (never cropped), composited over
 * the code's background so transparency behaves, reduced to luminance, then
 * binarised. The `edge` mode controls the reduction:
 * - "dither" — Floyd–Steinberg error diffusion (photographic, gradient-aware);
 * - "ordered" — Bayer 4×4 threshold map (stable, graphic halftone-screen);
 * - "crisp" — a hard 1-bit cut at the threshold.
 */
export async function logoToGrid(
  src: string,
  n: number,
  threshold: number,
  bg: string,
  edge: LogoEdge,
  opts: LogoRasterOptions = {},
): Promise<Uint8Array> {
  const res = Math.max(1, Math.round(opts.res ?? 1));
  const N = n * res;
  const brightness = opts.brightness ?? 1;
  const contrast = opts.contrast ?? 1;
  const fade = Math.min(0.95, Math.max(0, opts.fade ?? 0));
  /* luminance of the stock the image is composited onto — the wash target */
  const washTarget = bg === "transparent" ? 1 : luminance(bg);
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = N;
  canvas.height = N;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = bg === "transparent" ? "#ffffff" : bg;
  ctx.fillRect(0, 0, N, N);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  /*
   * Contain-fit: scale to fit, centre, leave field-colour letterboxing.
   * Some browsers (Safari) report 0×0 intrinsic dimensions for SVG images
   * that only carry a viewBox — a zero divisor would produce NaN geometry
   * and silently draw nothing. Fall back to a full-bleed draw (the viewBox
   * still scales correctly) whenever the intrinsic size is unusable.
   */
  const iw = img.naturalWidth || img.width || 0;
  const ih = img.naturalHeight || img.height || 0;
  const s = iw > 0 && ih > 0 ? Math.min(N / iw, N / ih) : NaN;
  if (Number.isFinite(s) && s > 0) {
    const dw = Math.max(1, iw * s);
    const dh = Math.max(1, ih * s);
    ctx.drawImage(img, (N - dw) / 2, (N - dh) / 2, dw, dh);
  } else {
    ctx.drawImage(img, 0, 0, N, N);
  }

  const { data } = ctx.getImageData(0, 0, N, N);
  const lum = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    let l =
      (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    /* brightness first, then contrast about the midpoint (same order as CSS filters) */
    l = (l * brightness - 0.5) * contrast + 0.5;
    /* then wash toward the stock colour so the modules stay dominant */
    if (fade > 0) l = l * (1 - fade) + washTarget * fade;
    lum[i] = l < 0 ? 0 : l > 1 ? 1 : l;
  }

  const grid = new Uint8Array(N * N);
  if (edge === "crisp") {
    for (let i = 0; i < N * N; i++) grid[i] = lum[i] < threshold ? 1 : 0;
    return grid;
  }

  if (edge === "ordered") {
    /* Bayer ordered dither: position-dependent threshold about the midpoint */
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const t = (BAYER4[(j % 4) * 4 + (i % 4)] + 0.5) / 16; // 0.03 … 0.97
        grid[j * N + i] = lum[j * N + i] < threshold + (t - 0.5) ? 1 : 0;
      }
    }
    return grid;
  }

  /* Floyd–Steinberg error diffusion (edge === "dither") */
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const idx = j * N + i;
      const old = lum[idx];
      const dark = old < threshold ? 1 : 0;
      grid[idx] = dark;
      const err = old - (dark ? 0 : 1);
      if (i + 1 < N) lum[idx + 1] += (err * 7) / 16;
      if (j + 1 < N) {
        if (i > 0) lum[idx + N - 1] += (err * 3) / 16;
        lum[idx + N] += (err * 5) / 16;
        if (i + 1 < N) lum[idx + N + 1] += err / 16;
      }
    }
  }
  return grid;
}

/** Fraction of the grid that became dark modules (0–1). Used for diagnostics. */
export function gridDarkFraction(grid: Uint8Array): number {
  if (grid.length === 0) return 0;
  let dark = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] === 1) dark++;
  return dark / grid.length;
}

export interface QRMatrix {
  version: number;
  size: number;
  data: Uint8Array;
  get(x: number, y: number): boolean;
}

export const EC_INFO: Record<
  ECLevel,
  { label: string; recovery: string; capacity: string; pct: number }
> = {
  L: { label: "Low", recovery: "≈ 7% damage", capacity: "100% capacity", pct: 100 },
  M: { label: "Medium", recovery: "≈ 15% damage", capacity: "≈ 86% capacity", pct: 86 },
  Q: { label: "High", recovery: "≈ 25% damage", capacity: "≈ 66% capacity", pct: 66 },
  H: { label: "Max", recovery: "≈ 30% damage", capacity: "≈ 56% capacity", pct: 56 },
};

/* ------------------------------------------------------------------ */
/* Matrix creation                                                     */
/* ------------------------------------------------------------------ */

export function createMatrix(text: string, ec: ECLevel): QRMatrix {
  const qr = createQRCode(text, { errorCorrectionLevel: ec });
  const size = qr.modules.size;
  const data = qr.modules.data;
  return {
    version: qr.version,
    size,
    data,
    get: (x, y) => data[y * size + x] === 1,
  };
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/* ------------------------------------------------------------------ */
/* Structure maps (finder / alignment / timing)                        */
/* ------------------------------------------------------------------ */

/** ISO/IEC 18004 alignment-pattern center coordinates, versions 1–40. */
const ALIGNMENT: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

export function alignmentCenters(version: number): Array<[number, number]> {
  const pos = ALIGNMENT[Math.min(version, 40)] ?? [];
  const centers: Array<[number, number]> = [];
  for (const r of pos) {
    for (const c of pos) {
      const overFinder =
        (r === 6 && c === 6) ||
        (r === 6 && c === pos[pos.length - 1]) ||
        (r === pos[pos.length - 1] && c === 6);
      if (!overFinder) centers.push([c, r]);
    }
  }
  return centers;
}

export function inFinderRegion(x: number, y: number, size: number): boolean {
  /* 7×7 finder plus its 1-module light separator ring */
  return (
    (x < 8 && y < 8) ||
    (x >= size - 8 && y < 8) ||
    (x < 8 && y >= size - 8)
  );
}

function inAlignmentRegion(
  x: number,
  y: number,
  centers: Array<[number, number]>,
): boolean {
  return centers.some(([cx, cy]) => Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2);
}

/**
 * Version-information blocks — two 3×6 strips present on version 7 and up
 * (size ≥ 45), tucked beside the top-right and bottom-left finders. They
 * carry NO error correction, so a merge that disturbs them kills the code
 * outright; they must always be left exactly as the encoder wrote them.
 */
function inVersionRegion(x: number, y: number, size: number): boolean {
  if (size < 45) return false;
  return (
    (y <= 5 && x >= size - 11 && x <= size - 9) ||
    (x <= 5 && y >= size - 11 && y <= size - 9)
  );
}

/**
 * Format-information rings around the three finders (row/column 8) plus the
 * single fixed dark module at (8, 4·version + 9). Format bits have BCH
 * protection and a second copy, but preserving them costs nothing.
 */
function inFormatRegion(x: number, y: number, size: number): boolean {
  const darkModuleY = size - 8; /* 4·version + 9, since size = 4·version + 17 */
  return (
    (y === 8 && (x <= 8 || x >= size - 8)) ||
    (x === 8 && (y <= 8 || y >= size - 7)) ||
    (x === 8 && y === darkModuleY)
  );
}

/** Functional patterns — always preserved intact, rendered solid. */
function isFunctional(x: number, y: number, size: number, centers: Array<[number, number]>): boolean {
  return (
    inFinderRegion(x, y, size) ||
    inAlignmentRegion(x, y, centers) ||
    inVersionRegion(x, y, size) ||
    inFormatRegion(x, y, size) ||
    x === 6 ||
    y === 6
  );
}

/* ------------------------------------------------------------------ */
/* SVG renderer                                                        */
/* ------------------------------------------------------------------ */

const f = (n: number) => (Math.round(n * 1000) / 1000).toString();

function finderSVG(ox: number, oy: number, o: QRRenderOptions): string {
  const r = o.cornerStyle === "rounded";
  const ro = r ? 2.3 : 0;
  const ri = r ? 1.5 : 0;
  const rc = r ? 1.05 : 0;
  return (
    `<rect x="${f(ox)}" y="${f(oy)}" width="7" height="7" rx="${ro}" fill="${o.fg}"/>` +
    `<rect x="${f(ox + 1)}" y="${f(oy + 1)}" width="5" height="5" rx="${ri}" fill="${o.bg}"/>` +
    `<rect x="${f(ox + 2)}" y="${f(oy + 2)}" width="3" height="3" rx="${rc}" fill="${o.fg}"/>`
  );
}

/**
 * Logo pass. Two philosophies:
 *
 * INLAY — the mark's cells replace the data modules (dark cell → dark module,
 * light cell → field). Every functional pattern — finders, separators,
 * alignment, timing, format rings, version blocks and the dark module — is
 * skipped and stays exactly as the encoder wrote it, because those patterns
 * have little or no error correction. Only true data modules are swapped.
 *
 * STITCH — the mark is dithered at `logoRes`× the module grid and laid down
 * first; then the *complete* code is repainted over it: functional patterns
 * as solid squares, and every data module as a centred dot in its own
 * polarity — dark modules in the ink colour, light modules in the field
 * colour. The picture peeks through the gaps of this two-colour lattice,
 * which maximises local contrast in both directions (the same "shrunken
 * module" trick that keeps dithered QR art scannable). Nothing is erased, so
 * the code stays readable at any error-correction level.
 */
function mergedLogoSVG(
  m: QRMatrix,
  o: QRRenderOptions,
  centers: Array<[number, number]>,
  mg: number,
): string {
  if (!o.logoGrid || o.logoN < 3 || o.logoN > m.size) return "";
  if (o.logoMode === "stitch") return stitchLogoSVG(m, o, centers, mg);
  return inlayLogoSVG(m, o, centers, mg);
}

function inlayLogoSVG(
  m: QRMatrix,
  o: QRRenderOptions,
  centers: Array<[number, number]>,
  mg: number,
): string {
  const region = o.logoN;
  if (!o.logoGrid || o.logoGrid.length !== region * region) return "";
  const ox = Math.floor((m.size - region) / 2);
  let out = "";
  for (let j = 0; j < region; j++) {
    for (let i = 0; i < region; i++) {
      const x = ox + i;
      const y = ox + j;
      if (isFunctional(x, y, m.size, centers)) continue;
      const dark = o.logoGrid[j * region + i] === 1;
      out += `<rect x="${mg + x}" y="${mg + y}" width="1" height="1" fill="${
        dark ? o.fg : o.bg
      }"/>`;
    }
  }
  return out;
}

function stitchLogoSVG(
  m: QRMatrix,
  o: QRRenderOptions,
  centers: Array<[number, number]>,
  mg: number,
): string {
  const n = o.logoN;
  const res = Math.max(1, Math.round(o.logoRes));
  const N = n * res;
  if (!o.logoGrid || o.logoGrid.length !== N * N) return "";
  const ox = Math.floor((m.size - n) / 2);
  const u = 1 / res;
  const w = u + 0.02; /* slight overlap kills anti-aliasing seams */
  let out = "";

  /* pass 1 — the dithered halftone, skipping cells under functional patterns */
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const mx = ox + Math.floor(i / res);
      const my = ox + Math.floor(j / res);
      if (isFunctional(mx, my, m.size, centers)) continue;
      const dark = o.logoGrid[j * N + i] === 1;
      out += `<rect x="${f(mg + ox + i * u)}" y="${f(mg + ox + j * u)}" width="${f(
        w,
      )}" height="${f(w)}" fill="${dark ? o.fg : o.bg}"/>`;
    }
  }

  /* pass 2 — the complete code over the image */
  for (let y = ox; y < ox + n; y++) {
    for (let x = ox; x < ox + n; x++) {
      if (inFinderRegion(x, y, m.size)) continue;
      const X = mg + x;
      const Y = mg + y;
      if (isFunctional(x, y, m.size, centers)) {
        /* alignment / timing stay solid for scan safety */
        out += `<rect x="${X}" y="${Y}" width="1" height="1" fill="${
          m.get(x, y) ? o.fg : o.bg
        }"/>`;
      } else {
        /* data modules as centred dots in their own polarity — dark ink dots
           and light field dots — so the code reads as a dense lattice and the
           picture only shows in the gaps */
        const dark = m.get(x, y);
        const fill = dark ? o.fg : o.bg;
        if (!dark && o.bg === "transparent") continue; /* nothing to draw */
        if (o.dotStyle === "dots") {
          out += `<circle cx="${f(X + 0.5)}" cy="${f(Y + 0.5)}" r="0.27" fill="${fill}"/>`;
        } else if (o.dotStyle === "rounded") {
          out += `<rect x="${f(X + 0.21)}" y="${f(Y + 0.21)}" width="0.58" height="0.58" rx="0.17" fill="${fill}"/>`;
        } else {
          out += `<rect x="${f(X + 0.19)}" y="${f(Y + 0.19)}" width="0.62" height="0.62" fill="${fill}"/>`;
        }
      }
    }
  }
  return out;
}

/**
 * Renders a QR matrix to an SVG string.
 * All output is generated from controlled internal data structures — no user HTML injection possible.
 */
export function renderSVG(m: QRMatrix, o: QRRenderOptions, px = 560): string {
  const centers = alignmentCenters(m.version);
  const total = m.size + o.margin * 2;
  const crisp = o.dotStyle === "square" ? ` shape-rendering="crispEdges"` : "";
  
  // Escape helper for any dynamic string content in SVG attributes
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  
  let body = `<rect width="${total}" height="${total}" fill="${esc(o.bg)}"/>`;

  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (!m.get(x, y)) continue;
      if (inFinderRegion(x, y, m.size)) continue;
      const px_ = x + o.margin;
      const py_ = y + o.margin;
      const styled = !isFunctional(x, y, m.size, centers);
      if (o.dotStyle === "dots" && styled) {
        body += `<circle cx="${f(px_ + 0.5)}" cy="${f(py_ + 0.5)}" r="0.44" fill="${esc(o.fg)}"/>`;
      } else if (o.dotStyle === "rounded" && styled) {
        body += `<rect x="${f(px_ + 0.06)}" y="${f(py_ + 0.06)}" width="0.88" height="0.88" rx="0.3" fill="${esc(o.fg)}"/>`;
      } else {
        body += `<rect x="${px_}" y="${py_}" width="1" height="1" fill="${esc(o.fg)}"/>`;
      }
    }
  }

  const mg = o.margin;
  body += finderSVG(mg, mg, o);
  body += finderSVG(mg + m.size - 7, mg, o);
  body += finderSVG(mg, mg + m.size - 7, o);

  body += mergedLogoSVG(m, o, centers, mg);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${total} ${total}" width="${px}" height="${px}"${crisp} role="img" aria-label="QR code">` +
    body +
    `</svg>`
  );
}

/* ------------------------------------------------------------------ */
/* Canvas renderer (high-res PNG export)                               */
/* ------------------------------------------------------------------ */

function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderCanvas(
  m: QRMatrix,
  o: QRRenderOptions,
  px: number,
): Promise<HTMLCanvasElement> {
  const total = m.size + o.margin * 2;
  const s = px / total;
  const canvas = document.createElement("canvas");
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  const centers = alignmentCenters(m.version);

  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, px, px);

  const module = (x: number, y: number, styled: boolean) => {
    const X = (x + o.margin) * s;
    const Y = (y + o.margin) * s;
    ctx.fillStyle = o.fg;
    if (o.dotStyle === "dots" && styled) {
      ctx.beginPath();
      ctx.arc(X + s / 2, Y + s / 2, s * 0.44, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.dotStyle === "rounded" && styled) {
      rr(ctx, X + s * 0.06, Y + s * 0.06, s * 0.88, s * 0.88, s * 0.3);
      ctx.fill();
    } else {
      ctx.fillRect(X, Y, s + 0.5, s + 0.5);
    }
  };

  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (!m.get(x, y) || inFinderRegion(x, y, m.size)) continue;
      module(x, y, !isFunctional(x, y, m.size, centers));
    }
  }

  const finder = (ox: number, oy: number) => {
    const X = (ox + o.margin) * s;
    const Y = (oy + o.margin) * s;
    const rounded = o.cornerStyle === "rounded";
    ctx.fillStyle = o.fg;
    rr(ctx, X, Y, 7 * s, 7 * s, rounded ? 2.3 * s : 0);
    ctx.fill();
    ctx.fillStyle = o.bg;
    rr(ctx, X + s, Y + s, 5 * s, 5 * s, rounded ? 1.5 * s : 0);
    ctx.fill();
    ctx.fillStyle = o.fg;
    rr(ctx, X + 2 * s, Y + 2 * s, 3 * s, 3 * s, rounded ? 1.05 * s : 0);
    ctx.fill();
  };

  finder(0, 0);
  finder(m.size - 7, 0);
  finder(0, m.size - 7);

  /* logo — inlay replaces data modules; stitch lays a halftone down and
     repaints the complete code over it */
  if (o.logoGrid && o.logoN >= 3 && o.logoN <= m.size) {
    if (o.logoMode === "stitch") {
      const n = o.logoN;
      const res = Math.max(1, Math.round(o.logoRes));
      const N = n * res;
      if (o.logoGrid.length === N * N) {
        const ox = Math.floor((m.size - n) / 2);
        const u = s / res;
        const w = u + 0.5;
        for (let j = 0; j < N; j++) {
          for (let i = 0; i < N; i++) {
            const mx = ox + Math.floor(i / res);
            const my = ox + Math.floor(j / res);
            if (isFunctional(mx, my, m.size, centers)) continue;
            ctx.fillStyle = o.logoGrid[j * N + i] === 1 ? o.fg : o.bg;
            ctx.fillRect((ox + i / res + o.margin) * s, (ox + j / res + o.margin) * s, w, w);
          }
        }
        for (let y = ox; y < ox + n; y++) {
          for (let x = ox; x < ox + n; x++) {
            if (inFinderRegion(x, y, m.size)) continue;
            const X = (x + o.margin) * s;
            const Y = (y + o.margin) * s;
            if (isFunctional(x, y, m.size, centers)) {
              ctx.fillStyle = m.get(x, y) ? o.fg : o.bg;
              ctx.fillRect(X, Y, s + 0.5, s + 0.5);
            } else {
              /* dark ink dots AND light field dots — the two-colour lattice */
              const dark = m.get(x, y);
              if (!dark && o.bg === "transparent") continue;
              ctx.fillStyle = dark ? o.fg : o.bg;
              if (o.dotStyle === "dots") {
                ctx.beginPath();
                ctx.arc(X + s / 2, Y + s / 2, s * 0.27, 0, Math.PI * 2);
                ctx.fill();
              } else if (o.dotStyle === "rounded") {
                rr(ctx, X + s * 0.21, Y + s * 0.21, s * 0.58, s * 0.58, s * 0.17);
                ctx.fill();
              } else {
                ctx.fillRect(X + s * 0.19, Y + s * 0.19, s * 0.62, s * 0.62);
              }
            }
          }
        }
      }
    } else {
      const region = o.logoN;
      if (o.logoGrid.length === region * region) {
        const ox = Math.floor((m.size - region) / 2);
        for (let j = 0; j < region; j++) {
          for (let i = 0; i < region; i++) {
            const x = ox + i;
            const y = ox + j;
            /* only true data modules may be swapped — functional patterns stay intact */
            if (isFunctional(x, y, m.size, centers)) continue;
            const dark = o.logoGrid[j * region + i] === 1;
            ctx.fillStyle = dark ? o.fg : o.bg;
            ctx.fillRect((x + o.margin) * s, (y + o.margin) * s, s + 0.5, s + 0.5);
          }
        }
      }
    }
  }

  return canvas;
}

/* ------------------------------------------------------------------ */
/* Colour science (WCAG 2.2 contrast)                                  */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  if (Number.isNaN(n) || h.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function isValidHex(v: string): boolean {
  return /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

function channelLum(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/* ------------------------------------------------------------------ */
/* Export helpers                                                      */
/* ------------------------------------------------------------------ */

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png");
  });
}
