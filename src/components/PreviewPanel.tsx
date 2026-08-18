import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "dompurify";
import { decodeQR } from "../lib/decode";
import { Download, Image as ImageIcon, Copy, ScanLine, Layers, Gauge, Printer, Sparkles, Share2 } from "lucide-react";
import type { QRMatrix } from "../lib/qr";
import {
  canvasToBlob,
  contrastRatio,
  downloadBlob,
  luminance,
  renderCanvas,
  renderSVG,
} from "../lib/qr";
import { toRenderOptions, type StyleState } from "./StylePanel";
import { IndustrialCard, PassFail, Pill, SpecCell, Tele, useToast } from "./ui";

const SUBSTRATES = [
  { id: "white", label: "White", finish: "paper", cls: "sub-white", color: "#ffffff" },
  { id: "kraft", label: "Kraft", finish: "brown paper", cls: "sub-kraft", color: "#bd8a52" },
  { id: "knit", label: "Knit", finish: "soft fabric", cls: "sub-knit", color: "#dfe3e7" },
  { id: "cotton", label: "Cotton", finish: "t-shirt fabric", cls: "sub-cotton", color: "#efebe0" },
  { id: "nylon", label: "Nylon", finish: "jacket fabric", cls: "sub-nylon", color: "#d3d9e1" },
] as const;

const LOUPE_ZOOM = 3.2;
type SubstrateId = (typeof SUBSTRATES)[number]["id"];

interface Check {
  label: string;
  detail: string;
  pass: boolean;
}

export function PreviewPanel({
  payload,
  matrix,
  style,
  filenameBase,
  logoGrid,
  logoN,
  onAutoFix,
}: {
  payload: string;
  matrix: QRMatrix | null;
  style: StyleState;
  filenameBase: string;
  logoGrid: Uint8Array | null;
  logoN: number;
  /** applies safer picture settings when the decode test fails */
  onAutoFix?: () => void;
}) {
  const toast = useToast();
  const [substrate, setSubstrate] = useState<SubstrateId>("white");
  const [sheet, setSheet] = useState(false);
  const [decode, setDecode] = useState<{ status: "testing" | "pass" | "fail"; ms?: number } | null>(null);
  const decodeReq = useRef(0);

  /* print-shop loupe: magnify the squares under the cursor */
  const [lens, setLens] = useState<{ x: number; y: number; w: number } | null>(null);
  const lensRaf = useRef(0);
  const finePointer = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
    [],
  );
  const onScopeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!finePointer) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    cancelAnimationFrame(lensRaf.current);
    lensRaf.current = requestAnimationFrame(() => setLens({ x, y, w: r.width }));
  };
  const onScopeLeave = () => {
    cancelAnimationFrame(lensRaf.current);
    setLens(null);
  };
  const sub = SUBSTRATES.find((s) => s.id === substrate)!;

  /* style state → renderer options (merged-logo grid included) */
  const renderOpts = (bg: string) => toRenderOptions(style, logoGrid, logoN, bg);

  /* Real decode test: render the exact export to a canvas and scan it back
     with jsQR, confirming the payload round-trips. Debounced + guarded. */
  useEffect(() => {
    if (!matrix) {
      setDecode(null);
      return;
    }
    setDecode({ status: "testing" });
    const id = ++decodeReq.current;
    const t = window.setTimeout(async () => {
      try {
        const canvas = await renderCanvas(matrix, renderOpts(style.bg), 768);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const t0 = performance.now();
        const decoded = await decodeQR(imageData);
        if (decodeReq.current !== id) return;
        setDecode(
          decoded === payload
            ? { status: "pass", ms: Math.max(1, Math.round(performance.now() - t0)) }
            : { status: "fail" },
        );
      } catch {
        if (decodeReq.current === id) setDecode({ status: "fail" });
      }
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, style, logoGrid, logoN, payload]);

  /* transparent-bg render so the code sits ON the substrate */
  const printedSVG = useMemo(
    () => (matrix ? renderSVG(matrix, renderOpts("transparent"), 640) : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matrix, style, logoGrid, logoN],
  );
  
  // Sanitize SVG with DOMPurify for defense-in-depth
  const printed = useMemo(() => 
    printedSVG ? DOMPurify.sanitize(printedSVG, { USE_PROFILES: { svg: true, svgFilters: true } }) : "",
    [printedSVG]
  );

  const subContrast = useMemo(
    () => (matrix ? contrastRatio(style.fg, sub.color) : 0),
    [matrix, style.fg, sub.color],
  );

  const checks = useMemo<Check[]>(() => {
    if (!matrix) return [];
    const ratio = contrastRatio(style.fg, style.bg);
    const polarity = luminance(style.fg) < luminance(style.bg);
    const list: Check[] = [
      {
        label: "Blank border",
        detail:
          style.margin >= 4
            ? "Enough empty space around the code"
            : "Not enough empty space — cameras may miss the code",
        pass: style.margin >= 4,
      },
      {
        label: "Dark vs light",
        detail:
          ratio >= 4.5
            ? "The code stands out clearly from the background"
            : "Too faint — make the code darker or the background lighter",
        pass: ratio >= 4.5,
      },
      {
        label: "Right way round",
        detail: polarity
          ? "Dark code on a light background — easy for cameras"
          : "Light code on dark — most phone cameras struggle with this",
        pass: polarity,
      },
    ];
    if (style.logo) {
      const area = logoN > 0 ? (logoN * logoN) / (matrix.size * matrix.size) : 0;
      const areaPct = Math.round(area * 100);
      if (style.logoMode === "stitch") {
        list.push({
          label: "Your picture",
          detail:
            logoN > 0
              ? area > 0.6
                ? "It fills the whole code — still works, but big pictures scan best printed large"
                : "It sits under the code, so nothing important is covered — safe at any size"
              : "Adding your picture…",
          pass: true,
        });
      } else {
        const okLogo = style.ec === "H" && area <= 0.25;
        list.push({
          label: "Your picture",
          detail: okLogo
            ? logoN > 0
              ? `It uses ${areaPct}% of the code${
                  area > 0.2 ? " — getting big, but still fine" : " — a comfy, safe size"
                }`
              : "Adding your picture…"
            : style.ec !== "H"
              ? "Set Safety level to Max, or switch to 'Behind the code'"
              : "It covers too much of the code — make the picture smaller",
          pass: okLogo,
        });
      }
    }
    if (payload.startsWith("http://")) {
      list.push({ label: "Link safety", detail: "Uses http, not https — phones will show a warning", pass: false });
    }
    list.push({
      label: "How busy it is",
      detail:
        matrix.version <= 10
          ? "Nice and simple — scans fast, even when small"
          : matrix.version <= 20
            ? "A fair bit going on — print it 3 cm wide or bigger"
            : "Very busy — print it large, and always test it first",
      pass: matrix.version <= 20,
    });
    return list;
  }, [matrix, style, payload, logoN]);

  const passed = checks.filter((c) => c.pass).length;
  /* fold the real decode test into the headline pass count */
  const totalChecks = checks.length + (decode ? 1 : 0);
  const totalPassed = passed + (decode?.status === "pass" ? 1 : 0);
  const verified =
    matrix !== null && totalChecks > 0 && totalPassed === totalChecks;

  const modulePx = matrix ? style.exportPx / (matrix.size + style.margin * 2) : 0;
  const printCm = ((style.exportPx / 300) * 2.54).toFixed(1);

  const doPng = async (): Promise<Blob | null> => {
    if (!matrix) return null;
    const canvas = await renderCanvas(matrix, renderOpts(style.bg), style.exportPx);
    return canvasToBlob(canvas);
  };

  const onDownloadPng = async () => {
    try {
      const blob = await doPng();
      if (!blob) return;
      downloadBlob(blob, `${filenameBase}.png`);
      toast("success", `PNG saved at ${style.exportPx} × ${style.exportPx}px`);
    } catch {
      toast("error", "PNG export failed — try again");
    }
  };

  const onDownloadSvg = () => {
    if (!matrix) return;
    const blob = new Blob([renderSVG(matrix, renderOpts(style.bg), style.exportPx)], {
      type: "image/svg+xml",
    });
    downloadBlob(blob, `${filenameBase}.svg`);
    toast("success", "SVG saved — it stays sharp at any size");
  };

  const onCopy = async () => {
    try {
      const blob = await doPng();
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("success", "Image copied to clipboard");
    } catch {
      toast("error", "Clipboard blocked — use Download instead");
    }
  };

  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const onShare = async () => {
    try {
      const blob = await doPng();
      if (!blob) return;
      const file = new File([blob], `${filenameBase}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "My QR code" });
        toast("success", "Shared!");
      } else {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast("success", "Sharing isn't here — copied to clipboard instead");
      }
    } catch {
      /* user dismissed the share sheet — nothing to report */
    }
  };

  return (
    <div className="sticky top-0 z-40 sm:top-[76px] lg:top-[92px] space-y-4">
      <IndustrialCard id="preview" stripe={verified ? "var(--t-ok)" : "var(--t-accent)"}>
        {/* header strip */}
        <div className="flex items-center justify-between gap-2 border-b-[1.5px] border-line bg-surface2/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="pulse-dot h-2 w-2 rounded-full bg-ok" />
            <h2 className="font-display text-[15px] font-black tracking-tight text-ink">03 · Your QR code</h2>
          </div>
          {matrix && verified && <Tele tone="ok">✓ ready to scan</Tele>}
          {matrix && !verified && <Tele tone="warn">check the notes below</Tele>}
        </div>

        {/* substrate selector */}
        <div className="px-5 pt-4">
          <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
            <Layers size={12} /> See it on…
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUBSTRATES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubstrate(s.id)}
                className={`flex items-center gap-1.5 rounded-full border-[1.5px] py-1 pl-1 pr-2.5 text-[10.5px] font-extrabold transition-all ${
                  substrate === s.id
                    ? "border-ink bg-ink text-bg shadow-brutal-accent"
                    : "border-line bg-surface text-ink-dim hover:border-ink hover:text-ink"
                }`}
              >
                <span className={`h-4 w-4 rounded-full border border-ink/40 ${s.cls}`} />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* QR viewport on substrate */}
        <div
          className={`scan-sweep relative mx-5 mt-3.5 flex items-center justify-center overflow-hidden rounded-[12px] border-[1.5px] border-ink p-6 ${sub.cls}`}
        >
          <span className="absolute left-3 top-3 z-[2] -rotate-2 border border-ink/25 bg-surface/85 px-2 py-[3px] font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-ink-dim">
            on {sub.label.toLowerCase()} · {sub.finish}
          </span>
          {matrix ? (
            <div className="relative w-full max-w-[300px]">
              <div
                key={`${payload.length}:${payload}:${style.fg}:${style.margin}:${style.dotStyle}:${style.cornerStyle}:${style.ec}:${style.logoScale}:${style.logoThreshold}:${style.logoEdge}:${logoN}:${printed.length}`}
                className="qr-pop qr-live"
                dangerouslySetInnerHTML={{ __html: printed }}
                onPointerMove={onScopeMove}
                onPointerLeave={onScopeLeave}
              />
              {lens && (
                <div
                  className="pointer-events-none absolute z-20 h-[132px] w-[132px] overflow-hidden rounded-full border-[1.5px] border-ink shadow-brutal"
                  style={{ left: lens.x - 66, top: lens.y - 66, background: sub.color }}
                  aria-hidden
                >
                  <div
                    className="qr-live absolute"
                    style={{ width: lens.w * LOUPE_ZOOM, left: 66 - lens.x * LOUPE_ZOOM, top: 66 - lens.y * LOUPE_ZOOM }}
                    dangerouslySetInnerHTML={{ __html: printed }}
                  />
                  <span className="absolute left-1/2 top-1/2 h-[15px] w-[1.5px] -translate-x-1/2 -translate-y-1/2 bg-accent2" />
                  <span className="absolute left-1/2 top-1/2 h-[1.5px] w-[15px] -translate-x-1/2 -translate-y-1/2 bg-accent2" />
                </div>
              )}
              {finePointer && !lens && (
                <span className="pointer-events-none absolute -bottom-1 right-0 z-[2] font-mono text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  hover to magnify
                </span>
              )}
            </div>
          ) : (
            <div className="flex aspect-square w-full max-w-[300px] flex-col items-center justify-center gap-3 rounded-[10px] border-[1.5px] border-dashed border-ink/30 bg-surface/70 text-center backdrop-blur-[1px]">
              <ScanLine size={28} className="text-accent2" />
              <p className="px-8 text-[13px] font-bold text-ink-dim">
                {payload
                  ? "That's too much to fit! Shorten what you're sharing, or turn the Safety level down a little."
                  : "Fill in the form and your code appears here instantly."}
              </p>
            </div>
          )}
        </div>

        {/* 2×2 spec grid */}
        {matrix && (
          <div className="grid grid-cols-2 gap-2 px-5 pt-4">
            <SpecCell
              label="Size when saved"
              value={`${style.exportPx} px`}
              hint={`prints about ${printCm} cm wide`}
            />
            <SpecCell label="Each tiny square" value={`${modulePx.toFixed(1)} px`} hint="this small on a screen" />
            <SpecCell
              label="Stands out on"
              value={`${subContrast.toFixed(0)}:1`}
              tone={subContrast >= 4.5 ? "ok" : subContrast >= 3 ? "warn" : "danger"}
              hint={subContrast >= 4.5 ? `${sub.label.toLowerCase()} ✓` : `${sub.label.toLowerCase()} — a bit faint`}
            />
            <SpecCell
              label="Blank border"
              value={`${style.margin} squares`}
              tone={style.margin >= 4 ? "ok" : "danger"}
              hint={style.margin >= 4 ? "plenty of space ✓" : "needs at least 4"}
            />
          </div>
        )}

        {/* scan-safety report */}
        {matrix && (
          <div className="mx-5 mt-4 overflow-hidden rounded-[12px] border-[1.5px] border-line">
            <div className="flex items-center justify-between border-b-[1.5px] border-line bg-surface2/60 px-4 py-2">
              <span className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">
                <Gauge size={12} /> Scan checks
              </span>
              <span
                className={`font-mono text-[11.5px] font-bold ${
                  totalPassed === totalChecks
                    ? "text-ok"
                    : totalPassed >= totalChecks / 2
                      ? "text-warn"
                      : "text-danger"
                }`}
              >
                {totalPassed}/{totalChecks}
              </span>
            </div>
            <ul className="divide-y divide-line-soft bg-surface">
              {/* real decode test — we actually scan the rendered code back */}
              {decode && (
                <li className="flex items-center gap-3 bg-surface2/40 px-4 py-2">
                  {decode.status === "testing" ? (
                    <span className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-warn" />
                  ) : (
                    <PassFail pass={decode.status === "pass"}>
                      {decode.status === "pass" ? "pass" : "risk"}
                    </PassFail>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold text-ink">
                      <ScanLine size={12} className="text-accent2" /> We scanned it for you
                    </p>
                    <p className="truncate text-[11px] font-medium text-ink-muted">
                      {decode.status === "testing"
                        ? "Scanning your code…"
                        : decode.status === "pass"
                          ? "It works! A phone camera can read it ✓"
                          : "It won't scan — try more Fade, or make the picture smaller"}
                    </p>
                  </div>
                  {decode.status === "fail" && onAutoFix && (
                    <button
                      type="button"
                      onClick={onAutoFix}
                      className="ml-auto flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-ink bg-accent px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.06em] text-accent-ink shadow-brutal-sm transition-transform hover:scale-[1.04] active:scale-95"
                    >
                      <Sparkles size={11} /> Fix it for me
                    </button>
                  )}
                </li>
              )}
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-3 px-4 py-2">
                  <PassFail pass={c.pass}>{c.pass ? "pass" : "risk"}</PassFail>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-ink">{c.label}</p>
                    <p className="truncate text-[11px] font-medium text-ink-muted">{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* export */}
        <div className="p-5">
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Pill onClick={onDownloadPng} disabled={!matrix} className="flex-1">
              <Download size={15} /> Save image
            </Pill>
            <Pill variant="dark" onClick={onDownloadSvg} disabled={!matrix} className="flex-1">
              <ImageIcon size={15} /> Save SVG
            </Pill>
            <Pill
              variant="ghost"
              onClick={onCopy}
              disabled={!matrix}
              title="Copy to clipboard"
              className="!px-4"
            >
              <Copy size={15} />
            </Pill>
            {canShare && (
              <Pill
                variant="ghost"
                onClick={onShare}
                disabled={!matrix}
                title="Send to a friend"
                className="!px-4"
              >
                <Share2 size={15} />
              </Pill>
            )}
            <Pill
              variant="ghost"
              onClick={() => setSheet(true)}
              disabled={!matrix}
              title="Open a ready-to-print sheet"
            >
              <Printer size={15} /> <span className="hidden sm:inline">Print it</span>
            </Pill>
          </div>
          {matrix && (
            <p className="mt-2.5 flex items-center justify-between text-[10.5px] font-semibold text-ink-muted">
              <span>
                Prints about <span className="font-bold text-ink-dim">{printCm} cm</span> wide
              </span>
              <span className={Number(printCm) < 2 ? "font-bold text-danger" : "font-bold text-ok"}>
                {Number(printCm) < 2 ? "too small — make it bigger" : "big enough to scan ✓"}
              </span>
            </p>
          )}
        </div>
      </IndustrialCard>

      {sheet && matrix && (
        <PrintSheet
          matrix={matrix}
          style={style}
          payload={payload}
          logoGrid={logoGrid}
          logoN={logoN}
          onClose={() => setSheet(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Print proof sheet — portal'd so only the paper reaches the printer  */
/* ------------------------------------------------------------------ */
const TICKS = [
  "-top-2 -left-2 border-t border-l",
  "-top-2 -right-2 border-t border-r",
  "-bottom-2 -left-2 border-b border-l",
  "-bottom-2 -right-2 border-b border-r",
];

function PrintSheet({
  matrix,
  style,
  payload,
  logoGrid,
  logoN,
  onClose,
}: {
  matrix: QRMatrix;
  style: StyleState;
  payload: string;
  logoGrid: Uint8Array | null;
  logoN: number;
  onClose: () => void;
}) {
  const cm = ((style.exportPx / 300) * 2.54).toFixed(1);
  const svg = renderSVG(matrix, toRenderOptions(style, logoGrid, logoN), 640);
  const date = new Date().toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const excerpt = payload.length > 64 ? `${payload.slice(0, 61)}…` : payload;

  useEffect(() => {
    const after = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("afterprint", after);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("afterprint", after);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const framed = (width: string, key: string) => (
    <div className="relative" key={key}>
      {TICKS.map((t) => (
        <span key={t} className={`pointer-events-none absolute h-3.5 w-3.5 border-neutral-400 ${t}`} />
      ))}
      <div className="qr-live" style={{ width }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );

  return createPortal(
    <div
      className="print-overlay fixed inset-0 z-[100] overflow-y-auto bg-ink/70 px-4 py-10 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Print proof sheet"
    >
      <div
        className="print-toolbar sticky top-4 z-10 mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border-[1.5px] border-bg/30 bg-ink px-2 py-2 shadow-brutal-accent"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-accent-ink transition-transform hover:scale-[1.03] active:scale-95"
        >
          <Printer size={14} /> Print this sheet
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-bg/80 transition-colors hover:text-bg"
        >
          Close
        </button>
      </div>

      <div
        className="print-paper mx-auto w-full max-w-[620px] border-[1.5px] border-ink bg-white text-neutral-900 shadow-brutal-accent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-[20px] font-black leading-none tracking-tight">
                RUN STITCHCODE
              </p>
              <p className="mt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.28em] text-neutral-500">
                Print proof
              </p>
            </div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{date}</p>
          </div>
          <div className="mt-4 border-t-2 border-neutral-900" />

          <div className="flex justify-center py-10">{framed(`${cm}cm`, "main")}</div>
          <p className="text-center font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">
            {cm} × {cm} cm — your chosen size
          </p>

          <div className="mt-9 grid grid-cols-[auto_1fr] items-center gap-6 border-t border-dashed border-neutral-300 pt-7">
            {framed("2cm", "min")}
            <div>
              <p className="font-display text-[13px] font-black uppercase tracking-tight">
                Minimum check — 2.0 cm
              </p>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-neutral-600">
                Scan this small copy from about 25 cm away. If it reads, the code is print-safe at
                every size above it.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3 border-t-2 border-neutral-900 pt-4 sm:grid-cols-4">
            <Meta
              label="Code colour"
              value={
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-3 w-3 rounded-[3px] border border-neutral-400"
                    style={{ background: style.fg }}
                  />
                  {style.fg}
                </span>
              }
            />
            <Meta label="Safety" value={`Level ${style.ec}`} />
            <Meta label="Blank border" value={`${style.margin} squares`} />
            <Meta label="Content" value={excerpt} />
          </div>

          <div className="mt-8 flex items-center justify-between gap-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-400">
            <span>Print at 100% scale — never “fit to page”</span>
            <span>generated locally · nothing sent</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-neutral-800">{value}</p>
    </div>
  );
}
