import { useId } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  Link as LinkIcon,
  Type as TypeIcon,
  Wifi,
  Contact,
  Mail,
  MessageSquare,
  Phone,
  ShieldCheck,
  Wand2,
  Dice5,
  Map,
  BookOpen,
  Globe,
} from "lucide-react";
import type { QRType, FormState } from "../lib/payloads";
import { QR_TYPE_META } from "../lib/payloads";
import { IndustrialCard, Tele, Tip, useToast } from "./ui";

const TYPE_ICONS: Record<QRType, typeof LinkIcon> = {
  url: LinkIcon,
  text: TypeIcon,
  wifi: Wifi,
  vcard: Contact,
  email: Mail,
  sms: MessageSquare,
  phone: Phone,
};

const ORDER: QRType[] = ["url", "text", "wifi", "vcard", "email", "sms", "phone"];

/* one-tap starters — friendly payloads a beginner can load instantly */
const IDEAS: Array<{
  icon: typeof Wand2;
  label: string;
  type: QRType;
  apply: (f: FormState) => FormState;
}> = [
  {
    icon: Globe,
    label: "Cool site",
    type: "url",
    apply: (f) => ({ ...f, url: "wikipedia.org/wiki/QR_code" }),
  },
  {
    icon: Wand2,
    label: "Joke",
    type: "text",
    apply: (f) => ({
      ...f,
      text: "Why did the QR code go to school? To get a little more scanned!",
    }),
  },
  {
    icon: Map,
    label: "Treasure clue",
    type: "text",
    apply: (f) => ({
      ...f,
      text: "X marks the spot! Look under the third bench in the playground.",
    }),
  },
  {
    icon: Contact,
    label: "My card",
    type: "vcard",
    apply: (f) => ({
      ...f,
      vcard: {
        ...f.vcard,
        firstName: "Ada",
        lastName: "Lovelace",
        org: "Code Club",
        title: "Chief Inventor",
        phone: "+44 20 7946 0000",
        email: "ada@codeclub.io",
        website: "",
      },
    }),
  },
  {
    icon: Wifi,
    label: "Home Wi-Fi",
    type: "wifi",
    apply: (f) => ({
      ...f,
      wifi: { ssid: "Home-Sweet-Home", password: "biscuit42", encryption: "WPA", hidden: false },
    }),
  },
  {
    icon: BookOpen,
    label: "Secret note",
    type: "text",
    apply: (f) => ({
      ...f,
      text: "Meet at the treehouse at 4 o'clock. Bring snacks. Tell no one!",
    }),
  },
];

const SURPRISES = [
  "The cake is a lie. Also: the treasure is buried where the shadow points at noon.",
  "If you can read this, you found the secret code. You get 10 house points!",
  "Riddle: I speak without a mouth and hear without ears. What am I? (An echo!)",
  "Congratulations! This QR code is 100% made of recycled pixels.",
  "Warning: scanning this code may cause sudden urges to build your own.",
  "Knock knock. Who's there? QR. QR who? QR you ready for a laugh yet?",
];

export function ContentForms({
  type,
  setType,
  forms,
  patch,
}: {
  type: QRType;
  setType: (t: QRType) => void;
  forms: FormState;
  patch: (fn: (f: FormState) => FormState) => void;
}) {
  const toast = useToast();
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    patch((f) => ({ ...f, [key]: value }));

  const surprise = () => {
    const msg = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    setType("text");
    patch((f) => ({ ...f, text: msg }));
    toast("success", "Surprise loaded — check your code!");
  };

  const loadIdea = (idea: (typeof IDEAS)[number]) => {
    setType(idea.type);
    patch((f) => idea.apply(f));
    toast("success", `${idea.label} loaded into the form`);
  };

  return (
    <IndustrialCard id="content" stripe="var(--t-accent2)">
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-[17px] font-black tracking-tight text-ink">
            01 · What it says
          </h2>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={surprise}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-accent px-3 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-accent-ink shadow-brutal-sm transition-transform hover:scale-[1.05] hover:rotate-[-2deg] active:scale-95"
            >
              <Dice5 size={13} /> Surprise me!
            </button>
            <Tele tone="ok" className="hidden sm:inline-flex">
              <ShieldCheck size={11} /> checked as you type
            </Tele>
          </span>
        </div>

        <Tabs.Root value={type} onValueChange={(v) => setType(v as QRType)}>
          <Tabs.List className="mb-5 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {ORDER.map((t) => {
              const Ico = TYPE_ICONS[t];
              return (
                <Tabs.Trigger
                  key={t}
                  value={t}
                  className="group flex flex-col items-center gap-1 rounded-[10px] border-[1.5px] border-line bg-surface2/60 px-1 py-2 text-ink-muted transition-all data-[state=active]:border-ink data-[state=active]:bg-ink data-[state=active]:text-bg data-[state=active]:shadow-brutal-accent"
                >
                  <Ico size={15} />
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.06em]">
                    {QR_TYPE_META[t].short}
                  </span>
                </Tabs.Trigger>
              );
            })}
          </Tabs.List>

          {/* quick ideas — one tap to fill the form */}
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink-muted">
              <Wand2 size={11} /> quick ideas
            </span>
            {IDEAS.map((idea) => {
              const Ico = idea.icon;
              return (
                <button
                  key={idea.label}
                  type="button"
                  onClick={() => loadIdea(idea)}
                  className="group inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface px-2.5 py-1 text-[10.5px] font-extrabold text-ink-dim transition-all hover:-translate-y-0.5 hover:border-ink hover:text-ink hover:shadow-brutal-sm active:translate-y-0 active:scale-95"
                >
                  <Ico size={12} className="text-accent2 transition-transform group-hover:scale-125" />
                  {idea.label}
                </button>
              );
            })}
          </div>

          <Tabs.Content value={type} className="space-y-3.5 focus-visible:outline-none">
            {type === "url" && (
              <>
                <TextInput
                  label="Your link"
                  value={forms.url}
                  onChange={(v) => set("url", v)}
                  placeholder="your-site.com"
                  tip="Don't worry about the https:// part — we add it for you."
                />
                {forms.url && !/^https:\/\//i.test(forms.url.trim()) && (
                  <Note tone="warn">Plain HTTP — most phones will flag this as insecure.</Note>
                )}
              </>
            )}

            {type === "text" && (
              <TextArea
                label="Your message"
                value={forms.text}
                onChange={(v) => set("text", v)}
                placeholder="Type anything you want people to read when they scan…"
                rows={4}
              />
            )}

            {type === "wifi" && (
              <>
                <TextInput
                  label="Network name (SSID)"
                  value={forms.wifi.ssid}
                  onChange={(v) => patch((f) => ({ ...f, wifi: { ...f.wifi, ssid: v } }))}
                  placeholder="Studio-Guest"
                />
                <div className="grid grid-cols-2 gap-3">
                  <SegEnc
                    value={forms.wifi.encryption}
                    onChange={(v) => patch((f) => ({ ...f, wifi: { ...f.wifi, encryption: v } }))}
                  />
                  <TextInput
                    label="Password"
                    value={forms.wifi.password}
                    onChange={(v) => patch((f) => ({ ...f, wifi: { ...f.wifi, password: v } }))}
                    placeholder="••••••••"
                    disabled={forms.wifi.encryption === "nopass"}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] font-bold text-ink-dim">
                  <input
                    type="checkbox"
                    checked={forms.wifi.hidden}
                    onChange={(e) =>
                      patch((f) => ({ ...f, wifi: { ...f.wifi, hidden: e.target.checked } }))
                    }
                    className="h-4 w-4 accent-[var(--t-accent)]"
                  />
                  Hidden network (not broadcast)
                </label>
              </>
            )}

            {type === "vcard" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="First name"
                    value={forms.vcard.firstName}
                    onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, firstName: v } }))}
                    placeholder="Ada"
                  />
                  <TextInput
                    label="Last name"
                    value={forms.vcard.lastName}
                    onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, lastName: v } }))}
                    placeholder="Lovelace"
                  />
                </div>
                <TextInput
                  label="Organisation"
                  value={forms.vcard.org}
                  onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, org: v } }))}
                  placeholder="Analytical Engines Ltd"
                />
                <TextInput
                  label="Job title"
                  value={forms.vcard.title}
                  onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, title: v } }))}
                  placeholder="Chief Algorithm Officer"
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="Phone"
                    value={forms.vcard.phone}
                    onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, phone: v } }))}
                    placeholder="+44 20 7946 0000"
                  />
                  <TextInput
                    label="Email"
                    value={forms.vcard.email}
                    onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, email: v } }))}
                    placeholder="ada@engines.co"
                  />
                </div>
                <TextInput
                  label="Website"
                  value={forms.vcard.website}
                  onChange={(v) => patch((f) => ({ ...f, vcard: { ...f.vcard, website: v } }))}
                  placeholder="https://engines.co"
                />
              </>
            )}

            {type === "email" && (
              <>
                <TextInput
                  label="To"
                  value={forms.email.to}
                  onChange={(v) => patch((f) => ({ ...f, email: { ...f.email, to: v } }))}
                  placeholder="hello@studio.co"
                />
                <TextInput
                  label="Subject"
                  value={forms.email.subject}
                  onChange={(v) => patch((f) => ({ ...f, email: { ...f.email, subject: v } }))}
                  placeholder="Print quote request"
                />
                <TextArea
                  label="Body"
                  value={forms.email.body}
                  onChange={(v) => patch((f) => ({ ...f, email: { ...f.email, body: v } }))}
                  placeholder="Pre-filled message…"
                  rows={3}
                />
              </>
            )}

            {type === "sms" && (
              <>
                <TextInput
                  label="Phone number"
                  value={forms.sms.number}
                  onChange={(v) => patch((f) => ({ ...f, sms: { ...f.sms, number: v } }))}
                  placeholder="+44 7700 900123"
                />
                <TextArea
                  label="Message"
                  value={forms.sms.message}
                  onChange={(v) => patch((f) => ({ ...f, sms: { ...f.sms, message: v } }))}
                  placeholder="Hi! Here's the link we discussed…"
                  rows={3}
                />
              </>
            )}

            {type === "phone" && (
              <TextInput
                label="Phone number"
                value={forms.phone}
                onChange={(v) => set("phone", v)}
                placeholder="+44 7700 900123"
                tip="Use full international format for cross-border scans."
              />
            )}
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </IndustrialCard>
  );
}

/* ------------------------- field atoms ---------------------------- */

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  tip,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tip?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className={disabled ? "opacity-45" : ""}>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-dim"
      >
        {label}
        {tip && <Tip text={tip} />}
      </label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border-[1.5px] border-ink bg-surface px-4 py-2 text-[13px] font-semibold text-ink placeholder:text-ink-muted/60 shadow-brutal-sm transition-shadow focus:shadow-brutal focus:outline-none"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold text-ink-dim">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-[12px] border-[1.5px] border-ink bg-surface px-4 py-2.5 text-[13px] font-semibold leading-relaxed text-ink placeholder:text-ink-muted/60 shadow-brutal-sm transition-shadow focus:shadow-brutal focus:outline-none"
      />
    </div>
  );
}

function SegEnc({
  value,
  onChange,
}: {
  value: "WPA" | "WEP" | "nopass";
  onChange: (v: "WPA" | "WEP" | "nopass") => void;
}) {
  const opts: Array<{ value: "WPA" | "WEP" | "nopass"; label: string }> = [
    { value: "WPA", label: "WPA/WPA2" },
    { value: "WEP", label: "WEP" },
    { value: "nopass", label: "Open" },
  ];
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-bold text-ink-dim">Security</span>
      <div className="inline-flex w-full rounded-full border-[1.5px] border-ink bg-surface2 p-1">
        {opts.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full px-1 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.03em] transition-colors ${
              value === o.value ? "bg-ink text-bg" : "text-ink-dim hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Note({ children, tone }: { children: React.ReactNode; tone: "warn" | "danger" }) {
  return (
    <p
      className={`flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[11.5px] font-bold ${
        tone === "warn" ? "border-warn/50 bg-warn/10 text-warn" : "border-danger/50 bg-danger/10 text-danger"
      }`}
    >
      {children}
    </p>
  );
}
