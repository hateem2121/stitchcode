import { useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionConfig, animate } from "motion/react";
import { QrCode, WifiOff, History, Trash2, RotateCcw, ArrowDown, ScanLine, Shuffle } from "lucide-react";
import DOMPurify from "dompurify";
DOMPurify.sanitize(""); // Initialize DOMPurify with window context
import {
  THEMES,
  applyTheme,
  getInitialTheme,
  persistTheme,
  type ThemeId,
} from "./lib/themes";
import type { QRType, FormState } from "./lib/payloads";
import { DEFAULT_FORMS, buildPayload, summarize } from "./lib/payloads";
import { createMatrix, renderSVG, logoToGrid, logoRegionModules, type QRMatrix } from "./lib/qr";
import { SAMPLE_LOGO_URL } from "./lib/sample";
import { ToastProvider, Reveal, Pill, Tele, Tip, Decode, useToast } from "./components/ui";
import { ContentForms } from "./components/ContentForms";
import { StylePanel, DEFAULT_STYLE, toRenderOptions, type StyleState } from "./components/StylePanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { useLogoGrid } from "./lib/useLogoGrid";
import { Anatomy, Checklist, FAQ } from "./components/Sections";
import { secureStorageSet, secureStorageGet, secureStorageRemove } from "./lib/crypto";

/* ------------------------------------------------------------------ */
/* History persistence                                                 */
/* ------------------------------------------------------------------ */
interface HistoryItem {
  id: string;
  ts: number;
  type: QRType;
  forms: FormState;
  style: StyleState;
  payload: string;
}
const HISTORY_KEY = "stitchcode:history";

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * Renders a saved build exactly as it was made — including the merged logo —
 * by re-rasterising the stored mark. Keeps thumbnails faithful to the studio.
 */
function HistoryThumb({ item }: { item: HistoryItem }) {
  const [thumb, setThumb] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const m = createMatrix(item.payload, item.style.ec);
        const st = item.style;
        let opts = { ...toRenderOptions(st, null, 0), margin: 2 };
        if (st.logo) {
          const n = logoRegionModules(m.size, st.logoScale);
          const res = st.logoMode === "stitch" ? 3 : 1;
          const grid = await logoToGrid(st.logo, n, st.logoThreshold, st.bg, st.logoEdge, {
            res,
            brightness: st.logoBrightness,
            contrast: st.logoContrast,
            fade: st.logoFade,
          });
          if (!live) return;
          opts = {
            ...opts,
            logoGrid: grid,
            logoN: n,
            logoRes: res,
            logoMode: st.logoMode,
            logoScale: st.logoScale,
          };
        }
        setThumb(renderSVG(m, opts, 96));
      } catch {
        setThumb("");
      }
    })();
    return () => {
      live = false;
    };
  }, [item]);
  // Sanitize SVG output with DOMPurify for defense-in-depth
  const sanitizedThumb = DOMPurify.sanitize(thumb, { USE_PROFILES: { svg: true, svgFilters: true } });
  return <div className="qr-live" dangerouslySetInnerHTML={{ __html: sanitizedThumb }} />;
}

/**
 * Loads history from encrypted localStorage.
 * Falls back to legacy unencrypted format for migration.
 */
async function loadHistory(): Promise<HistoryItem[]> {
  try {
    // Try encrypted storage first
    const encrypted = await secureStorageGet<HistoryItem[]>(HISTORY_KEY);
    if (encrypted && Array.isArray(encrypted)) {
      return encrypted.filter(
        (x): x is HistoryItem =>
          !!x &&
          typeof x === "object" &&
          typeof x.id === "string" &&
          typeof x.ts === "number" &&
          typeof x.type === "string" &&
          typeof x.payload === "string" &&
          !!x.style &&
          typeof x.style === "object" &&
          !!x.forms &&
          typeof x.forms === "object",
      );
    }
    
    // Fallback: migrate from legacy unencrypted format
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Migrate to encrypted storage
    const valid = parsed.filter(
      (x): x is HistoryItem =>
        !!x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.ts === "number" &&
        typeof x.type === "string" &&
        typeof x.payload === "string" &&
        !!x.style &&
        typeof x.style === "object" &&
        !!x.forms &&
        typeof x.forms === "object",
    );
    
    // Encrypt and store, then remove legacy
    if (valid.length > 0) {
      await secureStorageSet(HISTORY_KEY, valid);
      localStorage.removeItem(HISTORY_KEY);
    }
    return valid;
  } catch {
    return [];
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeId>(getInitialTheme);

  const switchTheme = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    persistTheme(id);
  };

  return (
    <ToastProvider>
      <MotionConfig reducedMotion="user">
      <div className="app-shell relative min-h-screen bg-bg text-ink">
        {/* ambient layers */}
        <div className="bg-blueprint pointer-events-none fixed inset-0 z-0" aria-hidden />
        <div className="bg-noise pointer-events-none fixed inset-0 z-0 opacity-60" aria-hidden />
        <div
          className="pointer-events-none fixed -top-40 left-1/2 z-0 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[110px]"
          style={{ background: "var(--t-accent)" }}
          aria-hidden
        />

        <div className="relative z-10">
          <Header theme={theme} onTheme={switchTheme} />
          <Opener />
          <Workbench />
          <Checklist />
          <Anatomy />
          <FAQ />
          <Footer />
        </div>
      </div>
      </MotionConfig>
    </ToastProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Header with quick-theme selector                                    */
/* ------------------------------------------------------------------ */
function Header({ theme, onTheme }: { theme: ThemeId; onTheme: (t: ThemeId) => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? h.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className="relative sticky top-0 z-50 border-b-[1.5px] border-ink bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border-[1.5px] border-ink bg-ink text-bg shadow-brutal-accent">
            <QrCode size={19} />
          </span>
          <span className="leading-none">
            <span className="block font-display text-[16px] font-black tracking-tight">
              RUN <span className="text-accent2">STITCH</span>CODE
            </span>
            <span className="block font-mono text-[8.5px] font-bold uppercase tracking-[0.28em] text-ink-muted">
              qr code studio
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-5 md:flex">
          {[
            ["Make a code", "#studio"],
            ["Inside a code", "#anatomy"],
            ["Tips", "#checklist"],
            ["Questions", "#faq"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-dim transition-colors hover:text-accent2"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Tele tone="ok" className="hidden sm:inline-flex">
            <WifiOff size={11} /> 100% offline
          </Tele>
          <div className="flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-surface p-1 shadow-brutal-sm">
            {THEMES.map((t) => (
              <Tip key={t.id} text={`${t.name} · ${t.tag}`}>
                <motion.button
                  aria-label={`Switch to ${t.name} theme`}
                  onClick={() => onTheme(t.id)}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                  className={`relative h-6 w-6 overflow-hidden rounded-full border-[1.5px] ${
                    theme === t.id ? "border-ink ring-2 ring-accent ring-offset-1 ring-offset-bg" : "border-ink/40"
                  }`}
                  style={{
                    background: `linear-gradient(135deg, ${t.bg} 0 50%, ${t.accent} 50% 100%)`,
                  }}
                >
                  {theme === t.id && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.ink }} />
                    </span>
                  )}
                </motion.button>
              </Tip>
            ))}
            <Tip text="Surprise me with a theme">
              <motion.button
                aria-label="Random theme"
                onClick={() => {
                  const others = THEMES.filter((t) => t.id !== theme);
                  onTheme(others[Math.floor(Math.random() * others.length)].id);
                }}
                whileHover={{ scale: 1.12, rotate: 12 }}
                whileTap={{ scale: 0.9, rotate: -12 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
                className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full border-[1.5px] border-ink/40 text-ink-dim hover:border-ink hover:text-ink"
              >
                <Shuffle size={11} />
              </motion.button>
            </Tip>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[-1.5px] h-[2.5px] origin-left bg-accent2"
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Opener — characteristic of the subject                              */
/* ------------------------------------------------------------------ */
function Stat({ n, label, delay }: { n: number; label: string; delay: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setV(n);
      return;
    }
    const controls = animate(0, n, {
      duration: 0.8,
      delay,
      ease: "easeOut",
      onUpdate: (x) => setV(Math.round(x)),
    });
    return () => controls.stop();
  }, [n, delay]);
  return (
    <div className="rounded-[12px] border-[1.5px] border-ink bg-surface px-4 py-3 shadow-brutal-sm">
      <span className="block font-display text-[26px] font-black leading-none text-accent2">
        {v}
      </span>
      <span className="mt-1 block font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
    </div>
  );
}

/*
 * Opener specimens — rendered through the same pipeline as the studio so the
 * hero shows the actual signature effect: a stitched two-colour weave.
 */
const SPECIMEN_PRESETS = [
  { id: "plain", label: "Plain", payload: "https://stitchcode.run", scale: 0, on: false },
  { id: "woven", label: "Woven", payload: "https://stitchcode.run", scale: 0.5, on: true },
  { id: "full", label: "Full", payload: "https://stitchcode.run", scale: 1, on: true },
];

/**
 * Renders a specimen through the real pipeline — optionally with the bundled
 * mark stitched in — so the opener demonstrates the product's signature look.
 */
function useStitchedSVG(payload: string, scale: number, stitched: boolean, px = 420): string {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    setSvg("");
    (async () => {
      try {
        const m = createMatrix(payload, "H");
        const base = toRenderOptions(DEFAULT_STYLE, null, 0, "transparent");
        if (!stitched) {
          setSvg(renderSVG(m, base, px));
          return;
        }
        const n = logoRegionModules(m.size, scale);
        const grid = await logoToGrid(SAMPLE_LOGO_URL, n, 0.5, "#ffffff", "dither", {
          res: 3,
          brightness: 1.6,
          contrast: 1.2,
          fade: 0.15,
        });
        if (!live) return;
        setSvg(
          renderSVG(
            m,
            { ...base, logoGrid: grid, logoN: n, logoRes: 3, logoMode: "stitch", logoScale: scale },
            px,
          ),
        );
      } catch {
        /* specimen stays empty on failure */
      }
    })();
    return () => {
      live = false;
    };
  }, [payload, scale, stitched, px]);
  return svg;
}

function Opener() {
  const [spec, setSpec] = useState<string>("woven");
  const cardRef = useRef<HTMLDivElement>(null);
  const preset = SPECIMEN_PRESETS.find((p) => p.id === spec) ?? SPECIMEN_PRESETS[1];

  const sampleSVG = useStitchedSVG(preset.payload, preset.scale, preset.on);
  const watermarkSVG = useStitchedSVG(
    "https://stitchcode.run/field-manual?batch=2026&press=offset&substrate=kraft",
    0.8,
    true,
    560,
  );

  // Sanitize SVG outputs with DOMPurify for defense-in-depth
  const sample = DOMPurify.sanitize(sampleSVG, { USE_PROFILES: { svg: true, svgFilters: true } });
  const watermark = DOMPurify.sanitize(watermarkSVG, { USE_PROFILES: { svg: true, svgFilters: true } });

  /* tactile pointer-tilt on the specimen card */
  useEffect(() => {
    const card = cardRef.current;
    if (!card || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        card.style.transform = `perspective(900px) rotateY(${(px * 9).toFixed(2)}deg) rotateX(${(
          -py * 9
        ).toFixed(2)}deg)`;
      });
    };
    const onLeave = () => {
      card.style.transform = "";
    };
    window.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="top" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 -top-16 hidden w-[460px] opacity-[0.055] lg:block"
      >
        <div className="qr-live animate-drift" dangerouslySetInnerHTML={{ __html: watermark }} />
      </div>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:pt-20">
        <Reveal>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Tele tone="accent">QR code studio</Tele>
            <Tele tone="ok">no signup</Tele>
            <Tele tone="ok">works offline</Tele>
          </div>
          <h1 className="font-display text-[clamp(42px,7vw,84px)] font-black leading-[0.95] tracking-[-0.025em] text-ink">
            Codes that scan
            <br />
            <span className="relative inline-block">
              <span className="relative z-10">first try,</span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.45, type: "spring", stiffness: 120, damping: 20 }}
                className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.28em] origin-left bg-accent"
                style={{ transform: "skewX(-8deg)" }}
              />
            </span>
            <br />
            every time.
          </h1>
          <p className="mt-6 max-w-[440px] text-[15px] font-semibold leading-relaxed text-ink-dim">
            Stitchcode builds your QR codes right on this page — no servers, no waiting. You can
            even stitch your own picture inside the code, and it checks every single one with a
            real scanner before you print it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Pill onClick={() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" })}>
              Open the studio <ArrowDown size={14} />
            </Pill>
            <Pill
              variant="ghost"
              onClick={() => document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth" })}
            >
              <ScanLine size={14} /> See the tips
            </Pill>
          </div>
          <div className="mt-10 grid max-w-[440px] grid-cols-3 gap-3">
            <Stat n={7} label="ways to share" delay={0.5} />
            <Stat n={5} label="paper tests" delay={0.65} />
            <Stat n={0} label="data sent out" delay={0.8} />
          </div>
        </Reveal>

        {/* floating specimen */}
        <Reveal className="relative hidden justify-center lg:flex">
          <motion.div
            initial={{ opacity: 0, y: 30, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: -4 }}
            transition={{ type: "spring", stiffness: 90, damping: 16 }}
            className="animate-floaty relative w-[330px]"
            style={{ ["--fl-rot" as string]: "-4deg" }}
          >
            <div className="absolute -left-8 top-10 h-full w-full rounded-[16px] border-[1.5px] border-ink bg-accent2" />
            <div
              ref={cardRef}
              className="relative overflow-hidden rounded-[16px] border-[1.5px] border-ink bg-white p-7 shadow-brutal will-change-transform"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#2e7d32]" />
                  encoding ·{" "}
                  {SPECIMEN_PRESETS.find((p) => p.id === spec)?.label.toLowerCase() ?? "link"}
                </span>
                <span className="h-2.5 w-2.5 rotate-45 bg-accent" />
              </div>
              <div
                key={spec}
                className="qr-live qr-pop"
                dangerouslySetInnerHTML={{ __html: sample }}
              />
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {SPECIMEN_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSpec(p.id)}
                    aria-pressed={spec === p.id}
                    className={`rounded-full border-[1.5px] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition-all ${
                      spec === p.id
                        ? "border-ink bg-ink text-white shadow-brutal-accent"
                        : "border-neutral-300 text-neutral-500 hover:border-ink hover:text-neutral-800"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="mt-3.5 flex items-center justify-between border-t border-dashed border-neutral-200 pt-3">
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  clear margins
                </span>
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                  strong contrast
                </span>
              </div>
            </div>
            <div className="absolute -right-6 -top-5 rotate-6 rounded-full border-[1.5px] border-ink bg-accent px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent-ink shadow-brutal-sm">
              scans ✓
            </div>
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Workbench + history                                                 */
/* ------------------------------------------------------------------ */
function Workbench() {
  const toast = useToast();
  const [type, setType] = useState<QRType>("url");
  const [forms, setForms] = useState<FormState>(DEFAULT_FORMS);
  const [style, setStyle] = useState<StyleState>(DEFAULT_STYLE);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Load history on mount
  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);
  
  const saveTimer = useRef<number | null>(null);

  const payload = useMemo(() => buildPayload(type, forms), [type, forms]);

  const matrix: QRMatrix | null = useMemo(() => {
    if (!payload) return null;
    try {
      return createMatrix(payload, style.ec);
    } catch {
      return null; // payload over capacity for this EC level
    }
  }, [payload, style.ec]);

  /* rasterise the uploaded mark into a module grid for the merge */
  const { grid: logoGrid, n: logoN, warning: logoWarning } = useLogoGrid(
    style.logo,
    matrix,
    {
      scale: style.logoScale,
      threshold: style.logoThreshold,
      edge: style.logoEdge,
      bg: style.bg,
      mode: style.logoMode,
      brightness: style.logoBrightness,
      contrast: style.logoContrast,
      fade: style.logoFade,
    },
  );

  /* how much of the code the merged mark currently replaces */
  const mergePct =
    matrix && logoN > 0
      ? Math.round(((logoN * logoN) / (matrix.size * matrix.size)) * 100)
      : null;

  /* autosave history (debounced) - now with encryption */
  useEffect(() => {
    if (!payload || !matrix) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setHistory((h) => {
        const sig = JSON.stringify({ p: payload, s: { ...style, logo: style.logo ? "1" : "0" } });
        if (h[0] && JSON.stringify({ p: h[0].payload, s: { ...h[0].style, logo: h[0].style.logo ? "1" : "0" } }) === sig)
          return h;
        const item: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ts: Date.now(),
          type,
          forms,
          style,
          payload,
        };
        const next = [item, ...h].slice(0, 8);
        // Encrypt and save to secure storage
        secureStorageSet(HISTORY_KEY, next).catch(() => {
          /* encryption or storage failed — skip silently */
        });
        return next;
      });
    }, 600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [payload, matrix, type, forms, style]);

  const restore = (item: HistoryItem) => {
    setType(item.type);
    setForms(item.forms);
    /* merge with defaults so older saved items lacking new fields stay valid */
    setStyle({ ...DEFAULT_STYLE, ...item.style });
    toast("success", "Build restored from history");
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth" });
  };

  const removeItem = async (id: string) => {
    setHistory((h) => {
      const next = h.filter((x) => x.id !== id);
      // Update encrypted storage asynchronously
      secureStorageSet(HISTORY_KEY, next).catch(() => {
        /* ignore */
      });
      return next;
    });
  };

  const clearAll = async () => {
    setHistory([]);
    await secureStorageRemove(HISTORY_KEY);
    toast("info", "History cleared");
  };

  const filenameBase = `stitchcode-${type}-${summarize(type, forms).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "code"}`;

  /* one-tap rescue: push the picture settings toward the research-backed
     safe zone (stronger fade + brighter exposure; smaller inlay footprint) */
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

  return (
    <section id="studio" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16 sm:px-8">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Tele tone="accent" className="mb-3">the studio</Tele>
          <h2 className="font-display text-[clamp(26px,3.6vw,40px)] font-black leading-[1.02] tracking-tight text-ink">
            <Decode text="Pick, style, print." />
          </h2>
        </div>
        <p className="max-w-[300px] text-[13px] font-semibold leading-relaxed text-ink-dim">
          Everything you change re-encodes in real time. The proof panel re-runs every safety check on each keystroke.
        </p>
      </Reveal>

      <div className="space-y-6">
        <Reveal>
          <ContentForms type={type} setType={setType} forms={forms} patch={setForms} />
        </Reveal>
        {/* on desktop the live proof sits side-by-side with the style settings */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Reveal>
          <StylePanel
            style={style}
            setStyle={setStyle}
            mergePct={mergePct}
            logoWarning={logoWarning}
          />
        </Reveal>
        <Reveal>
          <PreviewPanel
            payload={payload}
            matrix={matrix}
            style={style}
            filenameBase={filenameBase}
            logoGrid={logoGrid}
            logoN={logoN}
            onAutoFix={autoFix}
          />
        </Reveal>
        </div>
      </div>

      {/* history */}
      {history.length > 0 && (
        <Reveal className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-[17px] font-black tracking-tight text-ink">
              <History size={16} className="text-accent2" /> Recent builds
              <span className="rounded-full border border-line bg-surface2 px-2 py-0.5 font-mono text-[10px] font-bold text-ink-dim">
                {history.length}
              </span>
            </h3>
            <Pill variant="ghost" className="!px-3.5 !py-1.5 !text-[10.5px]" onClick={clearAll}>
              <Trash2 size={12} /> Clear all
            </Pill>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {history.map((item) => {
              return (
                <div
                  key={item.id}
                  className="group relative w-[124px] shrink-0 overflow-hidden rounded-[12px] border-[1.5px] border-ink bg-surface shadow-brutal-sm transition-transform hover:-translate-y-1"
                >
                  <button
                    onClick={() => restore(item)}
                    title="Restore this build"
                    className="block w-full p-2.5 text-left"
                    style={{ background: item.style.bg }}
                  >
                    <HistoryThumb item={item} />
                  </button>
                  <div className="flex items-center justify-between border-t-[1.5px] border-line bg-surface2/70 px-2.5 py-1.5">
                    <span className="truncate font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-ink-dim">
                      {item.type} · {timeAgo(item.ts)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      aria-label="Delete from history"
                      className="text-ink-muted transition-colors hover:text-danger"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <span className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase text-bg">
                      <RotateCcw size={9} /> restore
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </Reveal>
      )}
      {history.length === 0 && (
        <Reveal className="mt-10">
          <div className="flex items-center gap-3 rounded-[12px] border-[1.5px] border-dashed border-line bg-surface2/40 px-5 py-4">
            <History size={16} className="shrink-0 text-accent2" />
            <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              Your builds will land here — autosaved on this device only
            </p>
          </div>
        </Reveal>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
const MODULE_STRIP = Array.from({ length: 120 }, (_, i) => ((i * 2654435761) % 97) < 45);

function Footer() {
  return (
    <footer className="border-t-[1.5px] border-ink bg-ink text-bg">
      <div aria-hidden className="flex h-3 items-stretch gap-[3px] overflow-hidden border-b border-bg/15 px-3 py-[3px]">
        {MODULE_STRIP.map((b, i) => (
          <span key={i} className={`w-[6px] shrink-0 ${b ? "bg-bg/60" : ""}`} />
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] border-[1.5px] border-bg/40 bg-bg text-ink">
            <QrCode size={16} />
          </span>
          <div>
            <span className="block font-display text-[15px] font-black tracking-tight">
              RUN <span className="text-accent">STITCH</span>CODE
            </span>
            <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-bg/50">
              built local-first
            </span>
          </div>
        </div>
        <p className="max-w-[380px] text-[12.5px] font-semibold leading-relaxed text-bg/70">
          Everything is generated right in your browser.
          <span className="text-accent"> Nothing you create ever leaves this device.</span>
        </p>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-bg/35 px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-bg/85">
            ✓ no trackers
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-bg/35 px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-bg/85">
            ✓ no cloud
          </span>
        </div>
      </div>
    </footer>
  );
}
