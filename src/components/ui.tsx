import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import * as RadixSelect from "@radix-ui/react-select";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { Check, ChevronDown, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import { isValidHex } from "../lib/qr";

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */
type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  msg: string;
}
const ToastCtx = createContext<(kind: ToastKind, msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((kind: ToastKind, msg: string) => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[90] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full border-[1.5px] border-ink bg-ink px-4 py-2.5 text-[12.5px] font-bold text-bg shadow-brutal-accent"
            >
              {t.kind === "success" && <CheckCircle2 size={15} className="shrink-0 text-ok" />}
              {t.kind === "error" && <AlertTriangle size={15} className="shrink-0 text-danger" />}
              {t.kind === "info" && <Info size={15} className="shrink-0 text-accent" />}
              <span className="truncate">{t.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll reveal                                                       */
/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  className = "",
  stagger = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  as?: "div" | "section" | "ul" | "span";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        });
      },
      { threshold: 0.14 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`${stagger ? "stagger" : "reveal"} ${className}`}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Pill button — chunky, tactile, spring physics                       */
/* ------------------------------------------------------------------ */
export function Pill({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "dark" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-extrabold uppercase tracking-[0.08em] border-[1.5px] border-ink transition-colors select-none";
  const variants = {
    primary: "bg-accent text-accent-ink shadow-brutal",
    dark: "bg-ink text-bg shadow-brutal-accent",
    ghost: "bg-surface text-ink shadow-brutal-sm",
  }[variant];
  return (
    <motion.button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`${base} ${variants} ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${className}`}
    >
      {children}
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Industrial card — asymmetric, top accent stripe                     */
/* ------------------------------------------------------------------ */
export function IndustrialCard({
  children,
  stripe = "var(--t-accent)",
  className = "",
  id,
}: {
  children: ReactNode;
  stripe?: string;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden rounded-[14px] border-[1.5px] border-ink bg-surface shadow-brutal-sm ${className}`}
    >
      {/* top accent stripe with geometric cue */}
      <div className="flex h-[7px] w-full items-stretch" style={{ background: stripe }}>
        <div className="h-full w-10 bg-ink/85" />
        <div className="ml-1 h-full w-2.5 bg-ink/40" />
        <div className="ml-1 h-full w-1.5 bg-ink/25" />
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Monospace telemetry badge  [ ✓ LABEL ]                              */
/* ------------------------------------------------------------------ */
export function Tele({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "danger" | "neutral" | "accent";
  className?: string;
}) {
  const tones = {
    ok: "border-ok/50 text-ok",
    warn: "border-warn/50 text-warn",
    danger: "border-danger/50 text-danger",
    accent: "border-accent/60 text-ink bg-accent/15",
    neutral: "border-line text-ink-dim",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[5px] border px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tones} ${className}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Decode title — glyphs resolve into the real text when scrolled in   */
/* ------------------------------------------------------------------ */
const DECODE_GLYPHS = "█▓▒░▚▞▟#*+x=";
const scramble = (s: string) =>
  s
    .split("")
    .map((ch, i) => (ch === " " ? " " : DECODE_GLYPHS[(i * 7 + 3) % DECODE_GLYPHS.length]))
    .join("");

export function Decode({
  text,
  delay = 0,
  className = "",
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [out, setOut] = useState(() => (reduced ? "" : scramble(text)));
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now() + delay;
        const tick = (now: number) => {
          const t = Math.max(0, now - start);
          const settled = Math.floor(t / 42);
          if (settled >= text.length) {
            setOut(text);
            return;
          }
          let s = "";
          const phase = Math.floor(t / 50) * 3;
          for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            s += ch === " " ? " " : i < settled ? ch : DECODE_GLYPHS[(i * 7 + phase) % DECODE_GLYPHS.length];
          }
          setOut(s);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [text, delay, reduced]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      <span aria-hidden="true">{reduced ? text : out}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const gid = useId();
  const btns = useRef<Array<HTMLButtonElement | null>>([]);

  /* WAI-ARIA radio pattern: roving focus + arrow-key cycling */
  const onKey = (e: React.KeyboardEvent) => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx < 0) return;
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % options.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (idx - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next >= 0) {
      e.preventDefault();
      onChange(options[next].value);
      btns.current[next]?.focus();
    }
  };

  return (
    <div
      className={`inline-flex w-full rounded-full border-[1.5px] border-ink bg-surface2 p-1 ${className}`}
      role="radiogroup"
      onKeyDown={onKey}
    >
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              btns.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-full px-2 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.05em] transition-colors ${
              active ? "text-accent-ink" : "text-ink-dim hover:text-ink"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`seg-pill-${gid}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={{ type: "spring", stiffness: 500, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Slider row                                                          */
/* ------------------------------------------------------------------ */
export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  tip,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  tip?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink-dim">
          {label}
          {tip && <Tip text={tip} />}
        </span>
        <span className="rounded-[5px] border border-line bg-surface2 px-1.5 py-[1px] font-mono text-[11px] font-bold text-ink">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="qr-slider h-[6px] w-full cursor-pointer appearance-none rounded-full"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Colour field                                                        */
/* ------------------------------------------------------------------ */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  // Mirror external value changes during render (no effect round-trip).
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setText(value);
  }
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-bold text-ink-dim">{label}</span>
      <div className="flex items-center gap-2 rounded-full border-[1.5px] border-ink bg-surface p-1 pl-1.5 focus-within:shadow-brutal-sm">
        <label
          className="relative h-7 w-9 shrink-0 cursor-pointer overflow-hidden rounded-full border border-ink"
          style={{ background: value }}
        >
          <input
            type="color"
            value={isValidHex(value) ? (value.startsWith("#") ? value : `#${value}`) : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} colour picker`}
          />
        </label>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (isValidHex(e.target.value)) {
              /* canonicalise to #rrggbb so SVG fill / canvas fillStyle stay valid */
              const h = e.target.value.replace(/^#/, "").toLowerCase();
              onChange(`#${h.length === 3 ? h.split("").map((c) => c + c).join("") : h}`);
            }
          }}
          onBlur={() => setText(value)}
          spellCheck={false}
          aria-label={`${label} hex value`}
          placeholder="#1c1c1a"
          className="w-full bg-transparent font-mono text-[12px] font-bold uppercase text-ink outline-none"
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2×2 spec grid cell                                                  */
/* ------------------------------------------------------------------ */
export function SpecCell({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "ok" | "warn" | "danger" | "neutral";
}) {
  const valueTone = {
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
    neutral: "text-ink",
  }[tone];
  return (
    <div className="flex flex-col gap-1 rounded-[10px] border border-line bg-surface2/70 px-3 py-2.5">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </span>
      <span className={`font-mono text-[14px] font-bold leading-tight ${valueTone}`}>{value}</span>
      {hint && <span className="text-[10.5px] font-medium leading-snug text-ink-muted">{hint}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radix tooltip                                                       */
/* ------------------------------------------------------------------ */
export function Tip({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={120}>
      <RadixTooltip.Root>
        {children ? (
          <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        ) : (
          <RadixTooltip.Trigger asChild>
            <span
              tabIndex={0}
              className="inline-flex cursor-help items-center text-ink-muted hover:text-accent"
            >
              <Info size={12} />
            </span>
          </RadixTooltip.Trigger>
        )}
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-[80] max-w-[240px] rounded-[8px] border-[1.5px] border-ink bg-ink px-3 py-2 text-[11.5px] font-semibold leading-snug text-bg shadow-brutal-accent"
          >
            {text}
            <RadixTooltip.Arrow className="fill-ink" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

/* ------------------------------------------------------------------ */
/* Radix select                                                        */
/* ------------------------------------------------------------------ */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  tip,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  tip?: string;
}) {
  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-dim">
        {label}
        {tip && <Tip text={tip} />}
      </span>
      <RadixSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
        <RadixSelect.Trigger aria-label={label} className="flex w-full items-center justify-between gap-2 rounded-full border-[1.5px] border-ink bg-surface px-3.5 py-2 text-[12.5px] font-bold text-ink shadow-brutal-sm transition-shadow hover:shadow-brutal data-[state=open]:shadow-brutal">
          <RadixSelect.Value />
          <RadixSelect.Icon>
            <ChevronDown size={14} className="text-ink-dim" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className="z-[85] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[12px] border-[1.5px] border-ink bg-surface shadow-brutal"
          >
            <RadixSelect.Viewport className="p-1.5">
              {options.map((o) => (
                <RadixSelect.Item
                  key={o.value}
                  value={o.value}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-full px-3 py-2 text-[12.5px] font-bold text-ink-dim outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-ink data-[state=checked]:text-ink"
                >
                  <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check size={13} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pass / fail chip for scan report                                    */
/* ------------------------------------------------------------------ */
export function PassFail({ pass, children }: { pass: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex w-[52px] shrink-0 items-center justify-center rounded-full border px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] ${
        pass ? "border-ok/50 bg-ok/10 text-ok" : "border-danger/50 bg-danger/10 text-danger"
      }`}
    >
      {children}
    </span>
  );
}
