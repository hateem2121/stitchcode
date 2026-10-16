import { useEffect, useRef, useState } from "react";
import {
  gridDarkFraction,
  logoRegionModules,
  logoToGrid,
  type ECLevel,
  type LogoEdge,
  type QRMatrix,
} from "./qr";
import { maxSafeInlayN } from "./qrSafety";

export interface LogoGridState {
  grid: Uint8Array | null;
  /** region width in modules */
  n: number;
  /** sub-pixels per module inside `grid` (stitch: 3, inlay: 1) */
  res: number;
  /** diagnostic message when the mark can't produce a usable merge */
  warning: string | null;
}

export interface LogoGridParams {
  scale: number;
  threshold: number;
  edge: LogoEdge;
  bg: string;
  mode: "stitch" | "inlay";
  /** error-correction level of the code being merged into */
  ec: ECLevel;
  brightness: number;
  contrast: number;
  /** wash toward the stock colour, 0–1 */
  fade: number;
}

const IDLE: LogoGridState = { grid: null, n: 0, res: 1, warning: null };
const INVALID_FORMAT: LogoGridState = {
  grid: null,
  n: 0,
  res: 1,
  warning: "Invalid logo format — please use a valid image URL or data URI.",
};

/**
 * Rasterises the uploaded logo into a binary grid sized to the current code.
 * "Stitch" mode rasterises at 3× the module grid (sub-module halftone);
 * "inlay" works at module resolution. Re-runs whenever any input changes —
 * including a new logo image or a different matrix, with identical params.
 *
 * Idle/invalid states are derived during render (stable module constants,
 * guarded setState) so no effect is needed to clear them. A monotonically
 * increasing request id discards out-of-order rasterisation results.
 */
export function useLogoGrid(
  logo: string | null,
  matrix: QRMatrix | null,
  p: LogoGridParams,
): LogoGridState {
  const [state, setState] = useState<LogoGridState>(IDLE);
  const reqId = useRef(0);
  const { scale, threshold, edge, bg, mode, ec, brightness, contrast, fade } = p;

  const missing = !logo || !matrix;
  const invalid = !!logo && !logo.startsWith("data:") && !logo.startsWith("http");

  // Render-phase resets: guarded by stable references, so they settle immediately.
  if (missing && state !== IDLE) setState(IDLE);
  if (!missing && invalid && state !== INVALID_FORMAT) setState(INVALID_FORMAT);

  useEffect(() => {
    if (missing || invalid) return;
    const logoUrl: string = logo;
    const m: QRMatrix = matrix;
    const id = ++reqId.current;
    /* Inlay erases data modules, so the region is clamped to what the worst
       Reed-Solomon block can still correct at this EC level. Stitch erases
       nothing and keeps the full range. */
    const n =
      mode === "inlay"
        ? logoRegionModules(m.size, scale, maxSafeInlayN(m, ec))
        : logoRegionModules(m.size, scale);
    const res = mode === "stitch" ? 3 : 1;

    logoToGrid(logoUrl, n, threshold, bg, edge, {
      res,
      brightness,
      contrast,
      fade,
    })
      .then((grid) => {
        if (reqId.current !== id) return;
        const dark = gridDarkFraction(grid);
        const areaPct = Math.round((n * n) / (m.size * m.size) * 100);
        setState({
          grid,
          n,
          res,
          warning:
            dark < 0.02
              ? "We can barely see your picture — it's almost white! Try a darker picture, or slide 'How dark' up."
              : mode === "inlay" && areaPct > 30
                ? "Big carve-out — inlay erases modules, so keep it small or switch to Stitch mode."
                : areaPct > 60
                  ? "Large picture — prints best at 5cm or larger for reliable scanning."
                  : null,
        });
      })
      .catch(() => {
        if (reqId.current === id)
          setState({
            ...IDLE,
            warning: "Couldn't read that image file — try a different PNG or SVG.",
          });
      });
  }, [logo, matrix, missing, invalid, scale, threshold, edge, bg, mode, ec, brightness, contrast, fade]);

  if (missing) return IDLE;
  if (invalid) return INVALID_FORMAT;
  return state;
}
