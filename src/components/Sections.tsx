import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, ShieldCheck, Ruler, Contrast, Aperture, Printer, BookOpen, Microscope } from "lucide-react";
import { Reveal, Tele, Decode } from "./ui";
import DOMPurify from "dompurify";
import { createMatrix, renderSVG } from "../lib/qr";

/* ------------------------------------------------------------------ */
/* Field manual — numbered print rules                                 */
/* ------------------------------------------------------------------ */
const RULES = [
  {
    icon: Aperture,
    title: "Leave a clear border",
    body: "Give the code at least four empty squares of space on every side. Pictures, folds or edges that crowd it are the top reason codes won't scan.",
  },
  {
    icon: Contrast,
    title: "Dark code, light background",
    body: "Cameras read a dark code on a light background best. A neon code on a black shirt looks cool but barely ever scans.",
  },
  {
    icon: Ruler,
    title: "Match size to distance",
    body: "The farther away people scan from, the bigger the code must be. On a table, about 2 cm works; across a counter, go 4–5 cm. Never go under 2 cm.",
  },
  {
    icon: ShieldCheck,
    title: "Turn safety up for print",
    body: "A higher safety level means the code still works if it gets scratched, creased or covered in sticky fingers. For anything printed, use High or Max.",
  },
  {
    icon: Printer,
    title: "Print it, then try it",
    body: "A screen can't tell you the truth. Print the real thing, then scan it with two different phones — at an angle, and in dim light.",
  },
  {
    icon: BookOpen,
    title: "Keep it short",
    body: "The more you put in, the busier the code gets. Short links and short messages make simpler codes that scan faster and survive more.",
  },
];

export function Checklist() {
  return (
    <section id="checklist" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Tele tone="accent" className="mb-3">six golden rules</Tele>
          <h2 className="font-display text-[clamp(28px,4vw,44px)] font-black leading-[1.02] tracking-tight text-ink">
            Six rules that keep
            <br />
            every code{" "}
            <span className="whitespace-nowrap bg-accent px-2 text-ink shadow-brutal-sm">
              scannable.
            </span>
          </h2>
        </div>
        <svg
          className="hidden h-24 w-24 shrink-0 animate-spin-slow text-accent2 lg:block"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <defs>
            <path id="stamp-arc" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
          </defs>
          <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2.5 3.5" />
          <text fontSize="8.4" fontWeight="700" letterSpacing="1.7" fill="currentColor" className="font-mono">
            <textPath href="#stamp-arc">SCAN-SAFE · STAYS PRIVATE · PRINT-READY ·</textPath>
          </text>
          <rect x="45.5" y="45.5" width="9" height="9" fill="currentColor" transform="rotate(45 50 50)" />
        </svg>
        <p className="max-w-[300px] text-[13.5px] font-semibold leading-relaxed text-ink-dim">
          Distilled from the print standard and a decade of failed labels — the same checks Stitchcode runs live while you build.
        </p>
      </Reveal>

      <Reveal stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:pb-8 [&>*:nth-child(even)]:lg:mt-8">
        {RULES.map((r, i) => (
          <article
            key={r.title}
            className="group relative overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-surface p-5 shadow-brutal-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-brutal"
          >
            <div className="absolute inset-x-0 top-0 h-[5px] bg-accent opacity-70 transition-opacity group-hover:opacity-100" />
            <div className="mb-4 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] border-[1.5px] border-ink bg-accent/15 text-accent2">
                <r.icon size={19} />
              </span>
              <span className="font-mono text-[26px] font-bold leading-none text-line">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="mb-2 text-[15px] font-black tracking-tight text-ink">{r.title}</h3>
            <p className="text-[12.5px] font-medium leading-relaxed text-ink-dim">{r.body}</p>
          </article>
        ))}
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                       */
/* ------------------------------------------------------------------ */
const FAQS = [
  {
    q: "Are my codes generated on a server?",
    a: "No. Everything happens right in your browser — building, styling and saving. Nothing you type is ever sent anywhere, which is also why the whole tool keeps working with no internet.",
  },
  {
    q: "How big can I print my code?",
    a: "As large as you like. The SVG export is true vector, so a billboard is as sharp as a business card. For PNG, pick 2048px for large-format work and check the 300-DPI size readout under the proof.",
  },
  {
    q: "How does my picture get into the code?",
    a: "Two ways, and it's never just pasted on top. 'Behind the code' turns your picture into a soft pattern, then redraws the whole code over it — every dark dot and every light dot — so your picture peeks through the gaps of the code's own lattice and nothing important is ever covered. It's safe at any size, even filling the entire code. 'Into the code' lets your picture take the place of some of the code's dots, which looks bolder, so keep it under about a quarter of the code. Either way, the app scans your code back with a real decoder as you build, so you always know it works before you print.",
  },
  {
    q: "Why does the app want a light background?",
    a: "Phone cameras are built to read a dark code on a light background. A light code on a dark background fails on a lot of real phones, so the scan report warns you about it.",
  },
  {
    q: "What's the blank border for?",
    a: "It's the empty space that shows a scanner exactly where the code begins. It needs to be at least four squares wide — the app measures yours as you build and warns you the moment it gets too thin.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-24 sm:px-8">
      <Reveal className="mb-8 text-center">
        <Tele tone="accent" className="mb-3">straight answers</Tele>
        <h2 className="font-display text-[clamp(26px,3.4vw,38px)] font-black tracking-tight text-ink">
          <Decode text="Before you ask the internet." />
        </h2>
      </Reveal>
      <Reveal stagger className="space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={f.q}
              className={`overflow-hidden rounded-[12px] border-[1.5px] transition-shadow ${
                isOpen ? "border-ink bg-surface shadow-brutal" : "border-line bg-surface/70"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-[14px] font-black tracking-tight text-ink">{f.q}</span>
                <motion.span
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] ${
                    isOpen ? "border-ink bg-accent text-accent-ink" : "border-line text-ink-dim"
                  }`}
                >
                  <Plus size={14} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-[13px] font-medium leading-relaxed text-ink-dim">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Anatomy — an interactive tour of a real code's working parts        */
/* ------------------------------------------------------------------ */
const ANATOMY_PAYLOAD =
  "https://stitchcode.run/inside-a-qr-code?finders=7x7-corner-squares&timing=alternating-line" +
  "&alignment=5x5-target&version=name-tag&format=safety-bits&data=your-message-lives-here";

interface AnatomyPart {
  id: string;
  name: string;
  body: string;
  dot: { x: number; y: number };
  region?: { left: number; top: number; w: number; h: number };
  ring?: boolean;
}

export function Anatomy() {
  const [active, setActive] = useState("finder");

  const { svg, version, size } = useMemo(() => {
    const m = createMatrix(ANATOMY_PAYLOAD, "H");
    const svgStr = renderSVG(
      m,
      {
        ec: "H",
        margin: 3,
        fg: "#141412",
        bg: "#ffffff",
        dotStyle: "square",
        cornerStyle: "square",
        logoGrid: null,
        logoN: 0,
        logoRes: 1,
        logoMode: "stitch",
        logoScale: 0,
      },
      560,
    );
    return { svg: DOMPurify.sanitize(svgStr, { USE_PROFILES: { svg: true, svgFilters: true } }), version: m.version, size: m.size };
  }, []);

  /* every coordinate derives from the real module count, so it's exact */
  const parts = useMemo<AnatomyPart[]>(() => {
    const T = size + 6; /* code + quiet-zone margin of 3 per side */
    const p = (v: number) => v / T;
    return [
      {
        id: "finder",
        name: "Corner squares",
        body: "Three big squares hiding in the corners. A camera spots these first — they shout \u201chere's a code!\u201d and help it straighten everything out, even if the code is tilted.",
        dot: { x: p(6.5), y: p(6.5) },
        region: { left: p(3), top: p(3), w: p(8), h: p(8) },
      },
      {
        id: "timing",
        name: "Counting line",
        body: "The dotted line running between the corner squares. It lets the camera count the squares and measure the whole grid, row by row.",
        dot: { x: p(3 + size / 2), y: p(9.5) },
        region: { left: p(11), top: p(9), w: p(size - 16), h: p(1) },
      },
      {
        id: "alignment",
        name: "Straighten dot",
        body: "Bigger codes get a small bullseye near the bottom-right corner. It keeps the code readable even when it's bent on a bottle or scanned at a steep angle.",
        dot: { x: p(3 + size - 7), y: p(3 + size - 7) },
        region: { left: p(size - 6), top: p(size - 6), w: p(5), h: p(5) },
      },
      {
        id: "format",
        name: "Care card",
        body: "Tiny extra squares tucked beside the corners. They tell the camera how tough the code is and which colour way round it goes.",
        dot: { x: p(11.5), y: p(14.5) },
        region: { left: p(9), top: p(9), w: p(4), h: p(4) },
      },
      {
        id: "version",
        name: "Name tag",
        body: "Only on big codes: a small block that announces exactly how many squares to expect, so the camera never miscounts halfway through.",
        dot: { x: p(3 + size - 9.5), y: p(5.5) },
        region: { left: p(size - 8), top: p(3), w: p(3), h: p(6) },
      },
      {
        id: "data",
        name: "The message",
        body: "Every other square is your link or message, chopped up and scrambled into dark and light. This is the part a picture is allowed to borrow when you stitch one in.",
        dot: { x: p(3 + size * 0.3), y: p(3 + size * 0.7) },
        region: { left: p(3 + size * 0.16), top: p(3 + size * 0.55), w: p(size * 0.27), h: p(size * 0.3) },
      },
      {
        id: "quiet",
        name: "Clear border",
        body: "The empty space around the code — at least four squares wide. It shows the camera exactly where the code begins and ends. Crowding it is the #1 reason codes fail.",
        dot: { x: 0.5, y: p(1.5) },
        ring: true,
      },
    ];
  }, [size]);

  const part = parts.find((x) => x.id === active) ?? parts[0];

  return (
    <section id="anatomy" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 sm:px-8">
      <Reveal className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Tele tone="accent" className="mb-3">
            <Microscope size={11} /> take it apart
          </Tele>
          <h2 className="font-display text-[clamp(26px,3.6vw,40px)] font-black leading-[1.02] tracking-tight text-ink">
            <Decode text="What's inside a code?" />
          </h2>
        </div>
        <p className="max-w-[320px] text-[13.5px] font-semibold leading-relaxed text-ink-dim">
          This is a real code — every part below is in exactly the right place. Tap the dots to
          see what each one does.
        </p>
      </Reveal>

      <div className="grid items-start gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* the specimen */}
        <Reveal>
          <div className="relative rounded-[16px] border-[1.5px] border-ink bg-white p-6 shadow-brutal">
            <div className="relative">
              <div className="qr-live" dangerouslySetInnerHTML={{ __html: svg }} />

              {/* highlight region for the active part */}
              <AnimatePresence mode="wait">
                {part.ring ? (
                  <motion.span
                    key="ring"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 rounded-[8px] border-[3px] border-dashed border-accent2"
                  />
                ) : (
                  part.region && (
                    <motion.span
                      key={part.id}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="pointer-events-none absolute rounded-[4px] border-[2.5px] border-accent2 bg-accent2/25"
                      style={{
                        left: `${part.region.left * 100}%`,
                        top: `${part.region.top * 100}%`,
                        width: `${part.region.w * 100}%`,
                        height: `${part.region.h * 100}%`,
                      }}
                    />
                  )
                )}
              </AnimatePresence>

              {/* hotspot dots */}
              {parts.map((pt) => {
                const on = pt.id === active;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setActive(pt.id)}
                    aria-pressed={on}
                    aria-label={pt.name}
                    className={`absolute z-10 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] transition-all duration-200 ${
                      on
                        ? "scale-125 border-ink bg-accent shadow-brutal-sm"
                        : "border-bg bg-ink hover:scale-110 hover:bg-accent2"
                    }`}
                    style={{ left: `${pt.dot.x * 100}%`, top: `${pt.dot.y * 100}%` }}
                  >
                    <span
                      className={`absolute inset-[3px] rounded-full ${on ? "bg-accent-ink" : "bg-bg"}`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="mt-4 border-t border-dashed border-neutral-300 pt-3 text-center font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-neutral-500">
              a real version {version} code · {size}×{size} squares
            </p>
          </div>
        </Reveal>

        {/* the parts list */}
        <Reveal stagger className="space-y-2.5">
          {parts.map((pt, i) => {
            const on = pt.id === active;
            return (
              <div
                key={pt.id}
                className={`rounded-[12px] border-[1.5px] transition-all ${
                  on ? "border-ink bg-surface shadow-brutal" : "border-line bg-surface/60 hover:border-ink/60"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActive(pt.id)}
                  className="flex w-full items-center gap-3.5 px-4 py-3 text-left"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px] font-display text-[13px] font-black transition-colors ${
                      on ? "border-ink bg-accent text-accent-ink" : "border-line text-ink-dim"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className={`text-[14.5px] font-black tracking-tight ${on ? "text-ink" : "text-ink-dim"}`}>
                    {pt.name}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 pl-[58px] text-[13px] font-medium leading-relaxed text-ink-dim">
                        {pt.body}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
