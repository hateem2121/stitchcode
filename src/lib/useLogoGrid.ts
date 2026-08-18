import { useEffect, useRef, useState } from "react";
import { gridDarkFraction, logoRegionModules, logoToGrid, type LogoEdge, type QRMatrix } from "./qr";

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
  brightness: number;
  contrast: number;
  /** wash toward the stock colour, 0–1 */
  fade: number;
}

const IDLE: LogoGridState = { grid: null, n: 0, res: 1, warning: null };

/**
 * Rasterises the uploaded logo into a binary grid sized to the current code.
 * "Stitch" mode rasterises at 3× the module grid (sub-module halftone);
 * "inlay" works at module resolution. Re-runs whenever any input changes.
 *
 * A monotonically increasing request id guards against out-of-order
 * resolutions: if a newer rasterisation is requested before an older one
 * finishes, the stale result is discarded.
 * 
 * Optimized to reduce re-renders by memoizing params object.
 */
export function useLogoGrid(
  logo: string | null,
  matrix: QRMatrix | null,
  p: LogoGridParams,
): LogoGridState {
  const [state, setState] = useState<LogoGridState>(IDLE);
  const reqId = useRef(0);
  // Cache previous params to avoid unnecessary re-runs
  const prevParams = useRef<LogoGridParams | null>(null);

  useEffect(() => {
    const id = ++reqId.current;
    if (!logo || !matrix) {
      setState(IDLE);
      return;
    }
    
    // Skip if params haven't changed (shallow comparison)
    const pp = prevParams.current;
    if (pp && 
        pp.scale === p.scale && 
        pp.threshold === p.threshold && 
        pp.edge === p.edge && 
        pp.bg === p.bg && 
        pp.mode === p.mode && 
        pp.brightness === p.brightness && 
        pp.contrast === p.contrast && 
        pp.fade === p.fade) {
      return;
    }
    prevParams.current = { ...p };
    
    const n = logoRegionModules(matrix.size, p.scale);
    const res = p.mode === "stitch" ? 3 : 1;
    
    // Validate logo URL format before processing
    if (!logo.startsWith('data:') && !logo.startsWith('http')) {
      setState({
        ...IDLE,
        warning: "Invalid logo format — please use a valid image URL or data URI.",
      });
      return;
    }
    
    logoToGrid(logo, n, p.threshold, p.bg, p.edge, {
      res,
      brightness: p.brightness,
      contrast: p.contrast,
      fade: p.fade,
    })
      .then((grid) => {
        if (reqId.current !== id) return;
        const dark = gridDarkFraction(grid);
        
        // Calculate area percentage for better warnings
        const area = (n * n) / (matrix.size * matrix.size);
        const areaPct = Math.round(area * 100);
        
        setState({
          grid,
          n,
          res,
          warning:
            dark < 0.02
              ? "We can barely see your picture — it's almost white! Try a darker picture, or slide 'How dark' up."
              : areaPct > 60 && p.mode === "stitch"
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
  }, [logo, matrix, p.scale, p.threshold, p.edge, p.bg, p.mode, p.brightness, p.contrast, p.fade]);

  return state;
}
