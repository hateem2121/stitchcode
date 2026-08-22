import { describe, it, expect } from "vitest";
import {
  createMatrix,
  logoRegionModules,
  luminance,
  contrastRatio,
  renderSVG,
  type QRRenderOptions,
} from "./qr";

describe("qr.ts", () => {
  describe("createMatrix", () => {
    it("should generate a valid QRMatrix for simple payload", () => {
      const matrix = createMatrix("https://RUN-APPAREL.github.io/stitchcode", "M");
      expect(matrix).toBeDefined();
      expect(matrix.version).toBeGreaterThanOrEqual(1);
      expect(matrix.size).toBeGreaterThanOrEqual(21); // Version 1 is 21x21
      expect(matrix.data.length).toBe(matrix.size * matrix.size);
      expect(typeof matrix.get).toBe("function");
    });

    it("should generate higher version matrix for longer payloads", () => {
      const shortMatrix = createMatrix("short", "L");
      const longMatrix = createMatrix("https://example.com/very/long/url/path/with/parameters?query=1234567890&data=abcdef", "L");
      expect(longMatrix.size).toBeGreaterThanOrEqual(shortMatrix.size);
    });
  });

  describe("logoRegionModules", () => {
    it("should compute odd module count centered in the code", () => {
      const size = 33;
      const n = logoRegionModules(size, 0.3);
      expect(n % 2).toBe(1); // Must be odd for symmetry
      expect(n).toBeGreaterThanOrEqual(5);
    });

    it("should keep safe distance from finder patterns", () => {
      const size = 33;
      const n = logoRegionModules(size, 0.9);
      expect(n).toBeLessThanOrEqual(size - 16 + 1);
    });
  });

  describe("luminance and contrastRatio", () => {
    it("should calculate luminance of black and white correctly", () => {
      const black = luminance("#000000");
      const white = luminance("#ffffff");
      expect(black).toBeCloseTo(0, 3);
      expect(white).toBeCloseTo(1, 3);
    });

    it("should calculate WCAG contrast ratio for pure black on pure white as 21:1", () => {
      const ratio = contrastRatio("#000000", "#ffffff");
      expect(ratio).toBeCloseTo(21, 1);
    });

    it("should calculate contrast ratio symmetrically", () => {
      const r1 = contrastRatio("#1c1c1a", "#f0eedf");
      const r2 = contrastRatio("#f0eedf", "#1c1c1a");
      expect(r1).toBeCloseTo(r2, 4);
      expect(r1).toBeGreaterThan(4.5); // Meets WCAG AA
    });
  });

  describe("renderSVG", () => {
    const renderOpts: QRRenderOptions = {
      ec: "M",
      margin: 4,
      fg: "#1c1c1a",
      bg: "#ffffff",
      dotStyle: "square",
      cornerStyle: "square",
      logoGrid: null,
      logoN: 0,
      logoRes: 1,
      logoMode: "inlay",
      logoScale: 0.3,
    };

    it("should render clean valid SVG without errors", () => {
      const m = createMatrix("https://example.com", "M");
      const svg = renderSVG(m, renderOpts, 512);
      expect(svg).toContain("<svg");
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0');
      expect(svg).toContain("</svg>");
    });

    it("should support rounded dotStyle and rounded cornerStyle", () => {
      const m = createMatrix("https://example.com", "M");
      const svg = renderSVG(
        m,
        { ...renderOpts, dotStyle: "rounded", cornerStyle: "rounded" },
        512,
      );
      expect(svg).toContain("<svg");
      expect(svg).toContain("</svg>");
    });

    it("should support dots style", () => {
      const m = createMatrix("https://example.com", "M");
      const svg = renderSVG(
        m,
        { ...renderOpts, dotStyle: "dots", cornerStyle: "square" },
        512,
      );
      expect(svg).toContain("<svg");
      expect(svg).toContain("<circle");
    });
  });
});
