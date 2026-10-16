import { describe, it, expect } from "vitest";
import { create as createQRCode } from "qrcode";
import { createMatrix, type ECLevel } from "./qr";
import { decodeQR } from "./decode";
import { matrixToImageData } from "../test/raster";

/**
 * The generation core was swapped from the (dormant) `qrcode` npm package to
 * the vendored Nayuki qrcodegen reference implementation.
 *
 * What must stay identical: the chosen version/size (capacity decision) for
 * every payload × EC combination.
 *
 * What may legitimately differ: the mask pattern. The ISO spec recommends —
 * but does not require — the lowest-penalty mask, and the two libraries score
 * penalties differently (Nayuki follows the ISO scoring exactly). Either mask
 * yields a fully valid, decodable code, so the binding contract is asserted
 * with a real decode of the generated matrix.
 */
describe("qrcodegen vs the previous `qrcode` core", () => {
  const payloads = [
    "https://stitchcode.run",
    "12345",
    "WIFI:T:WPA;S:factory-floor;P:warp-and-weft-2026;;",
    "BEGIN:VCARD\\nVERSION:3.0\\nFN:Hateem Jamshaid\\nORG:RUN APPAREL\\nEND:VCARD",
    "unicode — accents éàü and CJK 曲线 and emoji 🧵",
    "x".repeat(500),
    "Hello world — StitchCode round-trip with punctuation, accents (éàü) and a longer payload to push the version up a little.",
  ];
  const levels: ECLevel[] = ["L", "M", "Q", "H"];

  for (const payload of payloads) {
    for (const ec of levels) {
      it(`v-${ec}: ${payload.slice(0, 30)}${payload.length > 30 ? "…" : ""} (${payload.length}b)`, async () => {
        const legacy = createQRCode(payload, { errorCorrectionLevel: ec });
        const modern = createMatrix(payload, ec);

        // identical capacity decision
        expect(modern.size).toBe(legacy.modules.size);
        expect(modern.version).toBe(legacy.version);

        // and the new core's output actually scans back to the payload
        const decoded = await decodeQR(matrixToImageData(modern));
        expect(decoded).toBe(payload);
      });
    }
  }
});
