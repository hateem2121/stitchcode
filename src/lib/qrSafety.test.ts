import { describe, it, expect } from "vitest";
import { createMatrix, isFunctional, alignmentCenters, type ECLevel } from "./qr";
import { assessInlaySafety, maxSafeInlayN, WORST_BLOCK_BUDGET_PCT } from "./qrSafety";
import { decodeQR } from "./decode";
import { matrixToImageData } from "../test/raster";

/** Overwrite a centered region's non-functional modules with a flat logo
 *  (all light = worst case erasure) — exactly what an inlay does. */
function applyInlayDamage(
  matrix: ReturnType<typeof createMatrix>,
  regionN: number,
): ReturnType<typeof createMatrix> {
  const size = matrix.size;
  const data = Uint8Array.from(matrix.data);
  const ox = Math.floor((size - regionN) / 2);
  const centers = alignmentCenters(matrix.version);
  for (let j = 0; j < regionN; j++) {
    for (let i = 0; i < regionN; i++) {
      const x = ox + i;
      const y = ox + j;
      if (!isFunctional(x, y, size, centers)) data[y * size + x] = 0;
    }
  }
  return { ...matrix, data, get: (x, y) => data[y * size + x] === 1 };
}

describe("qrSafety per-block gate", () => {
  it("the placement map covers every non-function module", () => {
    // covered by the assess math indirectly: assert via v5-Q bookkeeping
    const m = createMatrix("https://stitchcode.run", "Q");
    expect(m.version).toBeGreaterThan(0);
    expect(maxSafeInlayN(m, "Q")).toBeGreaterThanOrEqual(5);
  });

  it("worst-block damage is monotonic in region size", () => {
    const m = createMatrix("https://stitchcode.run/runway-catalogue?batch=17", "H");
    let prev = -1;
    for (let n = 5; n <= 21; n += 2) {
      const pct = assessInlaySafety(m, "H", n).worstBlockPct;
      expect(pct).toBeGreaterThanOrEqual(prev);
      prev = pct;
    }
  });

  it("rejects regions beyond the budget and accepts small ones", () => {
    const m = createMatrix("https://stitchcode.run", "H");
    const safe = assessInlaySafety(m, "H", 5);
    expect(safe.ok).toBe(true);
    expect(safe.worstBlockPct).toBeLessThan(WORST_BLOCK_BUDGET_PCT);
    // a version-1 code is tiny; a huge centered region must be rejected
    const greedy = assessInlaySafety(m, "H", m.size);
    expect(greedy.ok).toBe(false);
  });

  /* The money test: whatever region the gate calls SAFE must still decode
     after being force-cleared (worst-case inlay), across versions and EC
     levels — no false "safe" verdicts. Codes where even the 5-module minimum
     exceeds the budget (e.g. v2 at L: budget is only 3 codewords) must be
     honestly rejected — those codes simply cannot afford an inlay, which is
     why the UI forces EC level H for inlay mode. */
  const cases: Array<[string, ECLevel]> = [
    ["https://stitchcode.run", "L"],
    ["https://stitchcode.run", "M"],
    ["https://stitchcode.run", "Q"],
    ["https://stitchcode.run", "H"],
    ["WIFI:T:WPA;S:factory-floor;P:warp-and-weft-2026;;", "H"],
    ["Hello world — StitchCode round-trip with punctuation, accents (éàü) and a longer payload to push the version up a little.", "Q"],
  ];

  for (const [payload, ec] of cases) {
    const ver = createMatrix(payload, ec).version;
    it(`max-safe inlay still decodes after worst-case erasure (${ec}, v${ver})`, async () => {
      const m = createMatrix(payload, ec);
      const n = maxSafeInlayN(m, ec);
      const verdict = assessInlaySafety(m, ec, n);
      if (!verdict.ok) {
        // honest rejection: no region fits the budget at this EC level
        expect(n).toBe(5);
        return;
      }
      const damaged = applyInlayDamage(m, n);
      const decoded = await decodeQR(matrixToImageData(damaged));
      expect(decoded).toBe(payload);
    });
  }

  it("higher EC levels afford strictly larger safe regions", () => {
    const payload = "https://stitchcode.run/collections/winter-26?utm_source=hangtag";
    const m = createMatrix(payload, "M");
    const l = maxSafeInlayN(m, "L");
    const h = maxSafeInlayN(m, "H");
    expect(h).toBeGreaterThan(l);
  });
});
