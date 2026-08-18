/* ------------------------------------------------------------------ */
/* QR payload builders — the exact strings encoded into each code      */
/* ------------------------------------------------------------------ */

import type { ECLevel } from "./qr";

export type QRType = "url" | "text" | "wifi" | "vcard" | "email" | "sms" | "phone";

export const QR_TYPE_META: Record<QRType, { label: string; short: string }> = {
  url: { label: "Website link", short: "Link" },
  text: { label: "Short message", short: "Text" },
  wifi: { label: "Wi-Fi network", short: "Wi-Fi" },
  vcard: { label: "Contact card", short: "Card" },
  email: { label: "Email draft", short: "Email" },
  sms: { label: "Text message", short: "Message" },
  phone: { label: "Phone call", short: "Phone" },
};

export interface WifiForm {
  ssid: string;
  password: string;
  encryption: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

export interface VCardForm {
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  phone: string;
  email: string;
  website: string;
}

export interface EmailForm {
  to: string;
  subject: string;
  body: string;
}

export interface SmsForm {
  number: string;
  message: string;
}

export interface FormState {
  url: string;
  text: string;
  wifi: WifiForm;
  vcard: VCardForm;
  email: EmailForm;
  sms: SmsForm;
  phone: string;
}

export const DEFAULT_FORMS: FormState = {
  url: "https://qrsmith.studio",
  text: "",
  wifi: { ssid: "", password: "", encryption: "WPA", hidden: false },
  vcard: {
    firstName: "",
    lastName: "",
    org: "",
    title: "",
    phone: "",
    email: "",
    website: "",
  },
  email: { to: "", subject: "", body: "" },
  sms: { number: "", message: "" },
  phone: "",
};

/* ------------------------- escaping ------------------------------- */

function wifiEscape(v: string): string {
  return v.replace(/([\\;,:"])/g, "\\$1");
}

function vcardEscape(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([;,])/g, "\\$1");
}

export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  // Only allow http/https schemes to prevent javascript: and other dangerous protocols
  if (/^https?:\/\//i.test(v)) return v;
  // Reject any explicit non-http(s) scheme including data:, javascript:, etc.
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return "";
  // Default to https for bare domains
  return `https://${v}`;
}

/**
 * Sanitize text payload to prevent potential XSS when rendered in SVG.
 * While the SVG renderer escapes HTML entities, this provides defense-in-depth.
 */
export function sanitizeText(text: string): string {
  return text.replace(/[\u0000-\u001F\u007F]/g, "");
}

/* ------------------------- builders ------------------------------- */

export function buildPayload(type: QRType, f: FormState): string {
  switch (type) {
    case "url":
      return normalizeUrl(f.url);
    case "text":
      // Sanitize control characters from text payload
      return sanitizeText(f.text);
    case "wifi": {
      const w = f.wifi;
      const pass =
        w.encryption === "nopass" ? "" : `P:${wifiEscape(w.password)};`;
      const hidden = w.hidden ? "H:true;" : "";
      return `WIFI:T:${w.encryption === "nopass" ? "nopass" : w.encryption};S:${wifiEscape(
        w.ssid,
      )};${pass}${hidden};`;
    }
    case "vcard": {
      const v = f.vcard;
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${vcardEscape(v.lastName)};${vcardEscape(v.firstName)};;;`,
        `FN:${vcardEscape(`${v.firstName} ${v.lastName}`.trim())}`,
      ];
      if (v.org) lines.push(`ORG:${vcardEscape(v.org)}`);
      if (v.title) lines.push(`TITLE:${vcardEscape(v.title)}`);
      if (v.phone) lines.push(`TEL;TYPE=CELL:${v.phone.replace(/[^\d+]/g, "")}`);
      if (v.email) lines.push(`EMAIL:${v.email.trim()}`);
      if (v.website) lines.push(`URL:${normalizeUrl(v.website)}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    case "email": {
      const e = f.email;
      // Sanitize recipient to prevent header injection
      const safeTo = e.to.trim().replace(/[\r\n]/g, "");
      const qs: string[] = [];
      if (e.subject) qs.push(`subject=${encodeURIComponent(e.subject.replace(/[\r\n]/g, ""))}`);
      if (e.body) qs.push(`body=${encodeURIComponent(e.body.replace(/[\r\n]/g, ""))}`);
      return `mailto:${safeTo}${qs.length ? `?${qs.join("&")}` : ""}`;
    }
    case "sms":
      // URL-encode message content for proper parsing across all devices
      return `SMSTO:${f.sms.number.replace(/[^\d+]/g, "")}:${encodeURIComponent(f.sms.message)}`;
    case "phone":
      return `tel:${f.phone.replace(/[^\d+]/g, "")}`;
  }
}

/* ------------------------- validation ----------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE =
  /^[a-z][a-z0-9+.-]*:\/\/[^\s.]+(\.[^\s.]+)+([/?#]\S*)?$/i;

/**
 * QR Code capacity limits (bytes) for Version 40 at each error correction level.
 * Based on ISO/IEC 18004:2015 specifications.
 * These represent maximum byte capacity for binary mode encoding.
 */
const MAX_PAYLOAD_BYTES: Record<ECLevel, number> = {
  L: 2953, // Low (~7% recovery)
  M: 2331, // Medium (~15% recovery)
  Q: 1725, // High (~25% recovery)
  H: 1273, // Max (~30% recovery) - recommended for logo inlays
};

/** Returns a list of blocking problems. Empty = payload is encodeable. */
export function validate(type: QRType, f: FormState): string[] {
  switch (type) {
    case "url": {
      if (!f.url.trim()) return ["Enter a destination URL"];
      const u = normalizeUrl(f.url);
      if (!URL_RE.test(u)) return ["That doesn't parse as a valid URL"];
      // Check payload size against lowest EC level (most permissive)
      const bytes = new TextEncoder().encode(u).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        return ["URL exceeds maximum QR code capacity. Shorten the URL."];
      }
      return [];
    }
    case "text": {
      if (!f.text.trim()) return ["Type something to encode"];
      // Validate text payload size
      const bytes = new TextEncoder().encode(f.text).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        return ["Text exceeds maximum QR code capacity. Shorten the message."];
      }
      return [];
    }
    case "wifi": {
      const issues: string[] = [];
      if (!f.wifi.ssid.trim()) issues.push("Network name (SSID) is required");
      if (f.wifi.encryption !== "nopass" && !f.wifi.password)
        issues.push("Password required for WPA / WEP");
      
      // Validate WiFi payload size (can be large with long passwords)
      const testPayload = buildPayload("wifi", f);
      const bytes = new TextEncoder().encode(testPayload).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        issues.push("WiFi credentials exceed QR code capacity. Use shorter SSID/password.");
      }
      return issues;
    }
    case "vcard": {
      if (!f.vcard.firstName.trim() && !f.vcard.lastName.trim())
        return ["Add at least a first or last name"];
      if (f.vcard.email && !EMAIL_RE.test(f.vcard.email.trim()))
        return ["The contact email looks invalid"];
      
      // Validate vCard payload size
      const testPayload = buildPayload("vcard", f);
      const bytes = new TextEncoder().encode(testPayload).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        return ["Contact card exceeds QR code capacity. Remove some fields."];
      }
      return [];
    }
    case "email": {
      if (!f.email.to.trim()) return ["Recipient address is required"];
      if (!EMAIL_RE.test(f.email.to.trim())) return ["Recipient isn't a valid email"];
      
      // Validate email payload size (subject/body can be large)
      const testPayload = buildPayload("email", f);
      const bytes = new TextEncoder().encode(testPayload).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        return ["Email draft exceeds QR code capacity. Shorten subject/body."];
      }
      return [];
    }
    case "sms": {
      const digits = f.sms.number.replace(/[^\d]/g, "");
      if (digits.length < 6) return ["Enter a valid phone number"];
      
      // Validate SMS payload size
      const testPayload = buildPayload("sms", f);
      const bytes = new TextEncoder().encode(testPayload).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        return ["Message exceeds QR code capacity. Shorten the text."];
      }
      return [];
    }
    case "phone": {
      const digits = f.phone.replace(/[^\d]/g, "");
      if (digits.length < 6) return ["Enter a valid phone number"];
      
      // Validate phone payload size
      const testPayload = buildPayload("phone", f);
      const bytes = new TextEncoder().encode(testPayload).length;
      if (bytes > MAX_PAYLOAD_BYTES.L) {
        return ["Phone number format exceeds capacity."];
      }
      return [];
    }
  }
}

/** One-line human summary used in history entries. */
export function summarize(type: QRType, f: FormState): string {
  switch (type) {
    case "url":
      return normalizeUrl(f.url) || "—";
    case "text":
      return f.text.slice(0, 60) || "—";
    case "wifi":
      return f.wifi.ssid || "—";
    case "vcard":
      return [f.vcard.firstName, f.vcard.lastName].filter(Boolean).join(" ") || "—";
    case "email":
      return f.email.to || "—";
    case "sms":
      return f.sms.number || "—";
    case "phone":
      return f.phone || "—";
  }
}
