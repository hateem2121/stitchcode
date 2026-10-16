import { useRef, useState } from "react";
import { ArrowDownUp, Upload, Trash2, AlertTriangle, Palette, Sparkles } from "lucide-react";
import type { ECLevel, DotStyle, CornerStyle, LogoEdge } from "../lib/qr";
import { EC_INFO, INLAY_AREA_SAFE, INLAY_AREA_WARN } from "../lib/qr";
import type { StyleState } from "../lib/style";
import { SAMPLE_LOGO_URL } from "../lib/sample";
import { ColorField, IndustrialCard, Pill, Seg, SelectField, SliderRow, Tele, Tip, useToast } from "./ui";

const PRESETS: Array<{ name: string; fg: string; bg: string }> = [
  { name: "Classic black", fg: "#1c1c1a", bg: "#ffffff" },
  { name: "Hot red", fg: "#c22e12", bg: "#fff6f0" },
  { name: "Deep blue", fg: "#16336f", bg: "#eef2fb" },
  { name: "Forest green", fg: "#132a22", bg: "#eaf6ee" },
  { name: "Chocolate", fg: "#3e2417", bg: "#f7e9d7" },
  { name: "Cool grey", fg: "#1f2937", bg: "#f6f7f8" },
  { name: "Honey", fg: "#7a4a00", bg: "#ffe9b8" },
  { name: "Ocean", fg: "#073042", bg: "#dff3f2" },
];

export function StylePanel({
  style,
  setStyle,
  mergePct,
  logoWarning,
}: {
  style: StyleState;
  setStyle: (fn: (s: StyleState) => StyleState) => void;
  /** % of the code's modules the merged mark currently replaces, or null */
  mergePct: number | null;
  /** diagnostic when the uploaded mark can't produce a visible merge */
  logoWarning?: string | null;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const patch = (p: Partial<StyleState>) => setStyle((s) => ({ ...s, ...p }));

  const applyLogo = (logo: string, doneMsg: string) => {
    /* Stitch needs no extra redundancy; Inlay erases data, so raise to H */
    if (style.logoMode === "inlay" && style.ec !== "H") {
      patch({ logo, ec: "H" });
      toast("success", `${doneMsg} — we turned Safety up to H so it still scans`);
    } else {
      patch({ logo });
      toast("success", doneMsg);
    }
  };

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    /* some browsers report an empty MIME type for .svg — fall back to the extension */
    const looksSvg = /\.svg$/i.test(file.name);
    if (!file.type.startsWith("image/") && !looksSvg) {
      toast("error", "That file isn't an image");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast("error", "Logo too large — keep it under 1.5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => applyLogo(String(reader.result), "Added your picture");
    reader.onerror = () => toast("error", "Couldn't read that file — try again or use another image");
    reader.onabort = () => toast("info", "Reading the file was cancelled");
    reader.readAsDataURL(file);
  };

  return (
    <IndustrialCard id="style" stripe="var(--t-accent)">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-black tracking-tight text-ink">02 · Make it yours</h2>
          <Tele tone="accent">
            <Palette size={11} /> updates live
          </Tele>
        </div>

        {/* colours */}
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Code colour" value={style.fg} onChange={(v) => patch({ fg: v })} />
          <ColorField label="Paper colour" value={style.bg} onChange={(v) => patch({ bg: v })} />
        </div>
        <button
          onClick={() => patch({ fg: style.bg, bg: style.fg })}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-ink-dim transition-colors hover:border-ink hover:text-ink"
        >
          <ArrowDownUp size={12} /> Swap colours
        </button>

        {/* presets */}
        <div className="mt-4">
          <span className="mb-2 block text-[12px] font-bold text-ink-dim">Quick colours</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const active = style.fg === p.fg && style.bg === p.bg;
              return (
                <button
                  key={p.name}
                  title={p.name}
                  onClick={() => patch({ fg: p.fg, bg: p.bg })}
                  className={`flex items-center gap-1 rounded-full border-[1.5px] py-1 pl-1 pr-2.5 text-[10.5px] font-extrabold transition-all ${
                    active
                      ? "border-ink bg-ink text-bg shadow-brutal-accent"
                      : "border-line bg-surface text-ink-dim hover:border-ink hover:text-ink"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-ink/40"
                    style={{ background: `linear-gradient(135deg, ${p.fg} 50%, ${p.bg} 50%)` }}
                  />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* module geometry */}
        <div className="mt-5 space-y-3.5">
          <div>
            <span className="mb-1.5 block text-[12px] font-bold text-ink-dim">Dot shape</span>
            <Seg<DotStyle>
              value={style.dotStyle}
              onChange={(v) => patch({ dotStyle: v })}
              options={[
                { value: "square", label: "Square" },
                { value: "rounded", label: "Rounded" },
                { value: "dots", label: "Dots" },
              ]}
            />
          </div>
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-dim">
              Corner squares
              <Tip text="The three big squares cameras lock onto first. Square reads fastest — rounding is purely a style choice." />
            </span>
            <Seg<CornerStyle>
              value={style.cornerStyle}
              onChange={(v) => patch({ cornerStyle: v })}
              options={[
                { value: "square", label: "Square" },
                { value: "rounded", label: "Rounded" },
              ]}
            />
          </div>
        </div>

        {/* safety level */}
        <div className="mt-5">
          <SelectField<ECLevel>
            label="Safety level"
            tip="How tough your code is. If it gets a little dirty, smudged or torn, a tougher code still scans. Turn it up when you add a picture."
            value={style.ec}
            onChange={(v) => patch({ ec: v })}
            options={(Object.keys(EC_INFO) as ECLevel[]).map((k) => ({
              value: k,
              label: `Level ${k} — ${EC_INFO[k].label} · survives ${EC_INFO[k].recovery}`,
            }))}
          />
          <p className="mt-1.5 text-[11px] font-semibold text-ink-muted">
            Survives {EC_INFO[style.ec].recovery.toLowerCase()} · holds {EC_INFO[style.ec].capacity.toLowerCase()}
          </p>
        </div>

        {/* blank border */}
        <div className="mt-5">
          <SliderRow
            label="Blank border"
            tip="The empty ring of space around your code. Cameras need at least 4 squares of clear space here — don't put anything in it!"
            value={style.margin}
            min={0}
            max={10}
            onChange={(v) => patch({ margin: v })}
            format={(v) => `${v} squares`}
          />
          {style.margin < 4 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-bold text-warn">
              <AlertTriangle size={12} /> Too thin — scanners need at least 4 squares
            </p>
          )}
        </div>

        {/* merged logo */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onLogoFile(e.dataTransfer.files?.[0]);
          }}
          className={`mt-5 rounded-[12px] border-[1.5px] border-dashed p-3.5 transition-all duration-200 ${
            dragging
              ? "scale-[1.015] border-accent2 bg-accent2/10 shadow-brutal-sm"
              : "border-line bg-surface2/50"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[12px] font-bold text-ink-dim">
              Your picture in the code
              <Tip text="Your picture actually becomes part of the code — it's not just stuck on top! Make it bigger or fade it, and the live proof tells you right away if it still scans." />
            </span>
            {style.logo ? (
              <Pill variant="ghost" className="!px-3.5 !py-1.5 !text-[10.5px]" onClick={() => patch({ logo: null })}>
                <Trash2 size={12} /> Remove
              </Pill>
            ) : (
              <span className="flex items-center gap-1.5">
                <Pill variant="ghost" className="!px-3.5 !py-1.5 !text-[10.5px]" onClick={() => applyLogo(SAMPLE_LOGO_URL, "Added a sample picture")}>
                  <Sparkles size={12} /> Try a sample
                </Pill>
                <Pill variant="dark" className="!px-3.5 !py-1.5 !text-[10.5px]" onClick={() => fileRef.current?.click()}>
                  <Upload size={12} /> Upload
                </Pill>
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.svg"
              className="hidden"
              onChange={(e) => {
                onLogoFile(e.target.files?.[0]);
                /* reset so re-picking the very same file fires again */
                e.target.value = "";
              }}
            />
          </div>
          {style.logo && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={style.logo}
                alt="Logo merged into the code"
                className="h-11 w-11 rounded-[8px] border-[1.5px] border-ink object-contain"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-dim">
                    Mix style
                    <Tip text="'Behind the code' keeps every part of the code on top of your picture, so it always scans — safe at any size, even 100%. 'Into the code' lets your picture replace some of the dots — bolder look, but keep it smaller. Either way, the code's special squares (the corners, rings and timing lines) are never touched." />
                  </span>
                  <Seg<"stitch" | "inlay">
                    value={style.logoMode}
                    onChange={(v) => {
                      /* Inlay erases data modules — always raise safety to H */
                      if (v === "inlay" && style.ec !== "H") {
                        patch({ logoMode: v, ec: "H" });
                        toast("success", "Inlay carves into the code — Safety turned up to Max");
                      } else {
                        patch({ logoMode: v });
                      }
                    }}
                    options={[
                      { value: "stitch", label: "Behind the code" },
                      { value: "inlay", label: "Into the code" },
                    ]}
                  />
                </div>
                <SliderRow
                  label="How big"
                  tip={
                    style.logoMode === "stitch"
                      ? "Drag to make your picture bigger — it can fill the whole code (100%) because the code sits safely on top of it."
                      : "Drag to make your picture bigger. With 'Into the code', going past about half can hide too much of the code — the scan check will warn you."
                  }
                  value={Math.round(style.logoScale * 100)}
                  min={10}
                  max={100}
                  onChange={(v) => patch({ logoScale: v / 100 })}
                  format={(v) => `${v}%`}
                />
                <div className="-mt-1 flex items-center gap-1.5">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => patch({ logoScale: p / 100 })}
                      aria-pressed={Math.round(style.logoScale * 100) === p}
                      className={`rounded-full border-[1.5px] px-2.5 py-0.5 font-mono text-[9.5px] font-bold transition-all ${
                        Math.round(style.logoScale * 100) === p
                          ? "border-ink bg-ink text-surface shadow-brutal-accent"
                          : "border-line text-ink-muted hover:border-ink hover:text-ink"
                      }`}
                    >
                      {p === 100 ? "full" : `${p}%`}
                    </button>
                  ))}
                </div>
                <SliderRow
                  label="How dark"
                  tip="Slide to make your picture look darker or lighter inside the code. If it disappears, try a darker setting."
                  value={Math.round(style.logoThreshold * 100)}
                  min={15}
                  max={85}
                  step={5}
                  onChange={(v) => patch({ logoThreshold: v / 100 })}
                  format={(v) => `${v}%`}
                />
                <SliderRow
                  label="Brightness"
                  tip="Makes the whole picture brighter or dimmer — just like your phone screen."
                  value={Math.round(style.logoBrightness * 100)}
                  min={40}
                  max={260}
                  step={5}
                  onChange={(v) => patch({ logoBrightness: v / 100 })}
                  format={(v) => `${v}%`}
                />
                <SliderRow
                  label="Pop"
                  tip="Makes the dark parts darker and the light parts lighter, so your picture stands out from the code."
                  value={Math.round(style.logoContrast * 100)}
                  min={50}
                  max={260}
                  step={5}
                  onChange={(v) => patch({ logoContrast: v / 100 })}
                  format={(v) => `${v}%`}
                />
                <SliderRow
                  label="Fade"
                  tip="Softens your picture toward the background so the code on top is easy to scan. If the scan test says it won't work, add more fade."
                  value={Math.round(style.logoFade * 100)}
                  min={0}
                  max={60}
                  step={5}
                  onChange={(v) => patch({ logoFade: v / 100 })}
                  format={(v) => `${v}%`}
                />
                <div>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-dim">
                    Picture style
                    <Tip text="Photo gives smooth, soft shading. Dotty gives a fun pattern of dots. Sharp gives hard, crisp edges." />
                  </span>
                  <Seg<LogoEdge>
                    value={style.logoEdge}
                    onChange={(v) => patch({ logoEdge: v })}
                    options={[
                      { value: "dither", label: "Photo" },
                      { value: "ordered", label: "Dotty" },
                      { value: "crisp", label: "Sharp" },
                    ]}
                  />
                </div>
                {style.logoMode === "stitch" ? (
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-ok">
                    ✓ Safe at any size — the whole code sits on top of your picture
                  </p>
                ) : (
                  mergePct !== null && (
                    <p
                      className={`flex items-center gap-1.5 text-[11px] font-bold ${
                        mergePct > INLAY_AREA_SAFE * 100
                        ? "text-danger"
                        : mergePct > INLAY_AREA_WARN * 100
                          ? "text-warn"
                          : "text-ok"
                      }`}
                    >
                      {mergePct > INLAY_AREA_SAFE * 100 ? (
                        <>
                          <AlertTriangle size={12} /> Too busy to scan — make your picture smaller
                        </>
                      ) : mergePct > INLAY_AREA_WARN * 100 ? (
                        <>
                          <AlertTriangle size={12} /> Getting busy — try more Fade or a smaller picture
                        </>
                      ) : (
                        <>✓ Still easy to scan</>
                      )}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
          {style.logo && style.logoMode === "inlay" && style.ec !== "H" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-danger">
              <AlertTriangle size={12} /> "Into the code" needs the Safety level set to H — or use "Behind the code".
            </p>
          )}
          {style.logo && logoWarning && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] font-bold leading-snug text-warn">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {logoWarning}
            </p>
          )}
          {!style.logo && (
            <p className="mt-2 text-[10.5px] font-medium leading-snug text-ink-muted">
              Add a picture — or drop it right here! It becomes part of your code (not a sticker on
              top), and the live proof tells you instantly if it still scans.
            </p>
          )}
        </div>

        {/* export size */}
        <div className="mt-5">
          <SelectField<string>
            label="Picture size for saving"
            tip="How big the picture you save will be. 1024 is perfect for printing, 2048 for really big posters."
            value={String(style.exportPx)}
            onChange={(v) => patch({ exportPx: Number(v) })}
            options={[
              { value: "256", label: "256 px — small screens" },
              { value: "512", label: "512 px — web & small print" },
              { value: "1024", label: "1024 px — printing (best)" },
              { value: "2048", label: "2048 px — big posters" },
            ]}
          />
        </div>
      </div>
    </IndustrialCard>
  );
}
