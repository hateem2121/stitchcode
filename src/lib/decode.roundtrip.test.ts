import { describe, it, expect } from "vitest";
import { decodeQR } from "./decode";
import { createMatrix, type ECLevel } from "./qr";
import { matrixToImageData } from "../test/raster";

describe("decode round-trip (render → scan)", () => {
  const cases: Array<[string, ECLevel]> = [
    ["https://stitchcode.run", "L"],
    ["https://stitchcode.run", "H"],
    ["WIFI:T:WPA;S:factory-floor;P:warp-and-weft-2026;;", "Q"],
    ["BEGIN:VCARD\\nVERSION:3.0\\nFN:Hateem Jamshaid\\nEND:VCARD", "M"],
    ["Hello world — StitchCode round-trip with punctuation, accents (éàü) and a longer payload to push the version up a little.", "H"],
  ];

  for (const [payload, ec] of cases) {
    it(`decodes its own ${ec}-level code: ${payload.slice(0, 40)}${payload.length > 40 ? "…" : ""}`, async () => {
      const matrix = createMatrix(payload, ec);
      const decoded = await decodeQR(matrixToImageData(matrix));
      expect(decoded).toBe(payload);
    });
  }

  it("decodes an inverted (light-on-dark) export via the polarity retry", async () => {
    const payload = "https://stitchcode.run/inverted";
    const matrix = createMatrix(payload, "M");
    const decoded = await decodeQR(
      matrixToImageData(matrix, { fg: [247, 244, 232], bg: [26, 26, 24] }),
    );
    expect(decoded).toBe(payload);
  });

  it("decodes at a small module size (4px, near the practical scan floor)", async () => {
    const payload = "small-modules";
    const matrix = createMatrix(payload, "H");
    const decoded = await decodeQR(matrixToImageData(matrix, { modulePx: 4 }));
    expect(decoded).toBe(payload);
  });

  it("still returns null for blank pixels", async () => {
    const blank = new ImageData(120, 120);
    expect(await decodeQR(blank)).toBeNull();
  });
});
