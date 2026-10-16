import type { ECLevel, DotStyle, CornerStyle, QRRenderOptions, LogoEdge } from "./qr";

/**
 * Style state shared between the StylePanel, PreviewPanel and history —
 * kept out of the component files so fast-refresh boundaries stay clean.
 */
export interface StyleState {
  ec: ECLevel;
  /** quiet zone in modules */
  margin: number;
  fg: string;
  bg: string;
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  /** uploaded mark, as a data URL */
  logo: string | null;
  /**
   * "stitch" — the mark is dithered at 3× the module grid and the complete
   * code is repainted over it (nothing is erased, any EC level works).
   * "inlay" — the mark replaces the data modules (needs level H).
   */
  logoMode: "stitch" | "inlay";
  /** logo region as a fraction of the code width (0.1 – 0.5) */
  logoScale: number;
  /** luminance cutoff — below it, a pixel becomes dark */
  logoThreshold: number;
  /** pre-exposure applied before thresholding (1 = unchanged) */
  logoBrightness: number;
  /** contrast about the midpoint, after brightness (1 = unchanged) */
  logoContrast: number;
  /** wash toward the stock colour, 0–0.6 */
  logoFade: number;
  /**
   * How the mark's tones become modules: "dither" (Floyd–Steinberg,
   * photographic), "ordered" (Bayer halftone-screen, graphic), or "crisp"
   * (hard 1-bit cut).
   */
  logoEdge: LogoEdge;
  exportPx: number;
}

export const DEFAULT_STYLE: StyleState = {
  ec: "Q",
  margin: 4,
  fg: "#1c1c1a",
  bg: "#ffffff",
  dotStyle: "square",
  cornerStyle: "square",
  logo: null,
  logoMode: "stitch",
  logoScale: 0.34,
  logoThreshold: 0.5,
  logoBrightness: 1.5,
  logoContrast: 1.2,
  logoFade: 0.25,
  logoEdge: "dither",
  exportPx: 1024,
};

/** Map the user-facing style state onto the renderer's options. */
export function toRenderOptions(
  s: StyleState,
  logoGrid: Uint8Array | null,
  logoN: number,
  bgOverride?: string,
): QRRenderOptions {
  return {
    ec: s.ec,
    margin: s.margin,
    fg: s.fg,
    bg: bgOverride ?? s.bg,
    dotStyle: s.dotStyle,
    cornerStyle: s.cornerStyle,
    logoGrid,
    logoN,
    logoRes: s.logoMode === "stitch" ? 3 : 1,
    logoMode: s.logoMode,
    logoScale: s.logoScale,
  };
}
