import { describe, it, expect } from "vitest";
import {
  buildPayload,
  normalizeUrl,
  sanitizeText,
  validate,
  summarize,
  DEFAULT_FORMS,
  type FormState,
} from "./payloads";

describe("payloads.ts", () => {
  describe("normalizeUrl", () => {
    it("should prepend https:// to bare domains", () => {
      expect(normalizeUrl("example.com")).toBe("https://example.com");
      expect(normalizeUrl("sub.domain.org/path?q=1")).toBe("https://sub.domain.org/path?q=1");
    });

    it("should preserve valid http and https URLs", () => {
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
      expect(normalizeUrl("https://secure.example.com/test")).toBe("https://secure.example.com/test");
    });

    it("should reject dangerous protocols", () => {
      expect(normalizeUrl("javascript:alert(1)")).toBe("");
      expect(normalizeUrl("data:text/html,<h1>hi</h1>")).toBe("");
      expect(normalizeUrl("vbscript:msgbox(1)")).toBe("");
      expect(normalizeUrl("file:///etc/passwd")).toBe("");
    });

    it("should return empty string for blank input", () => {
      expect(normalizeUrl("   ")).toBe("");
      expect(normalizeUrl("")).toBe("");
    });
  });

  describe("sanitizeText", () => {
    it("should strip control characters", () => {
      expect(sanitizeText("Hello\u0000World\u0007!")).toBe("HelloWorld!");
      expect(sanitizeText("Normal Text 123")).toBe("Normal Text 123");
    });
  });

  describe("buildPayload", () => {
    const baseForm: FormState = { ...DEFAULT_FORMS };

    it("should build URL payload", () => {
      const f = { ...baseForm, url: "RUN-APPAREL.github.io/stitchcode" };
      expect(buildPayload("url", f)).toBe("https://RUN-APPAREL.github.io/stitchcode");
    });

    it("should build Text payload", () => {
      const f = { ...baseForm, text: "Sample text payload" };
      expect(buildPayload("text", f)).toBe("Sample text payload");
    });

    it("should build WiFi payload with WPA", () => {
      const f: FormState = {
        ...baseForm,
        wifi: { ssid: "MyOffice;Net", password: 'sec"ret:123', encryption: "WPA", hidden: true },
      };
      const result = buildPayload("wifi", f);
      expect(result).toBe('WIFI:T:WPA;S:MyOffice\\;Net;P:sec\\"ret\\:123;H:true;;');
    });

    it("should build WiFi payload with nopass", () => {
      const f: FormState = {
        ...baseForm,
        wifi: { ssid: "OpenWiFi", password: "", encryption: "nopass", hidden: false },
      };
      const result = buildPayload("wifi", f);
      expect(result).toBe("WIFI:T:nopass;S:OpenWiFi;;");
    });

    it("should build vCard payload with properly escaped fields", () => {
      const f: FormState = {
        ...baseForm,
        vcard: {
          firstName: "Jane",
          lastName: "Doe",
          org: "Acme, Inc.",
          title: "Lead Engineer",
          phone: "+1 (555) 019-2834",
          email: "jane@acme.com",
          website: "acme.com",
        },
      };
      const result = buildPayload("vcard", f);
      expect(result).toContain("BEGIN:VCARD");
      expect(result).toContain("VERSION:3.0");
      expect(result).toContain("N:Doe;Jane;;;");
      expect(result).toContain("FN:Jane Doe");
      expect(result).toContain("ORG:Acme\\, Inc.");
      expect(result).toContain("TEL;TYPE=CELL:+15550192834");
      expect(result).toContain("EMAIL:jane@acme.com");
      expect(result).toContain("URL:https://acme.com");
      expect(result).toContain("END:VCARD");
    });

    it("should build Email payload", () => {
      const f: FormState = {
        ...baseForm,
        email: { to: "support@stitchcode.com", subject: "Help Needed", body: "Please check this." },
      };
      const result = buildPayload("email", f);
      expect(result).toBe("mailto:support@stitchcode.com?subject=Help%20Needed&body=Please%20check%20this.");
    });

    it("should build SMS payload", () => {
      const f: FormState = {
        ...baseForm,
        sms: { number: "+1 (555) 123-4567", message: "Meeting at 5" },
      };
      const result = buildPayload("sms", f);
      expect(result).toBe("SMSTO:+15551234567:Meeting%20at%205");
    });

    it("should build Phone payload", () => {
      const f: FormState = { ...baseForm, phone: "+1 (800) 555-0199" };
      expect(buildPayload("phone", f)).toBe("tel:+18005550199");
    });
  });

  describe("validate", () => {
    const baseForm: FormState = { ...DEFAULT_FORMS };

    it("should validate empty URL", () => {
      expect(validate("url", { ...baseForm, url: "" })).toEqual(["Enter a destination URL"]);
    });

    it("should validate invalid URL", () => {
      expect(validate("url", { ...baseForm, url: "not-a-valid-url" })).toEqual([
        "That doesn't parse as a valid URL",
      ]);
    });

    it("should validate valid URL", () => {
      expect(validate("url", { ...baseForm, url: "https://example.com" })).toEqual([]);
    });

    it("should validate empty text", () => {
      expect(validate("text", { ...baseForm, text: "" })).toEqual(["Type something to encode"]);
    });

    it("should validate missing WiFi password when encrypted", () => {
      expect(
        validate("wifi", {
          ...baseForm,
          wifi: { ssid: "Net", password: "", encryption: "WPA", hidden: false },
        }),
      ).toEqual(["Password required for WPA / WEP"]);
    });

    it("should validate email format", () => {
      expect(
        validate("email", {
          ...baseForm,
          email: { to: "invalid-email", subject: "", body: "" },
        }),
      ).toEqual(["Recipient isn't a valid email"]);
    });
  });

  describe("summarize", () => {
    const baseForm: FormState = { ...DEFAULT_FORMS };

    it("should summarize each payload type", () => {
      expect(summarize("url", { ...baseForm, url: "example.com" })).toBe("https://example.com");
      expect(summarize("text", { ...baseForm, text: "Sample text" })).toBe("Sample text");
      expect(summarize("wifi", { ...baseForm, wifi: { ...baseForm.wifi, ssid: "HomeNet" } })).toBe("HomeNet");
      expect(
        summarize("vcard", {
          ...baseForm,
          vcard: { ...baseForm.vcard, firstName: "Alice", lastName: "Smith" },
        }),
      ).toBe("Alice Smith");
      expect(summarize("email", { ...baseForm, email: { ...baseForm.email, to: "a@b.com" } })).toBe("a@b.com");
      expect(summarize("sms", { ...baseForm, sms: { ...baseForm.sms, number: "1234567" } })).toBe("1234567");
      expect(summarize("phone", { ...baseForm, phone: "+123456" })).toBe("+123456");
    });
  });
});
