import type { QRMatrix } from "../lib/qr";

/**
 * Rasterise a QR matrix straight into RGBA pixels — no canvas involved, so
 * decode round-trip tests run in any environment.
 */
export function matrixToImageData(
  matrix: QRMatrix,
  opts: {
    modulePx?: number;
    quiet?: number;
    fg?: [number, number, number];
    bg?: [number, number, number];
  } = {},
): ImageData {
  const { modulePx = 8, quiet = 4, fg = [28, 28, 26], bg = [255, 255, 255] } = opts;
  const total = (matrix.size + quiet * 2) * modulePx;
  const data = new Uint8ClampedArray(total * total * 4);
  for (let y = 0; y < total; y++) {
    const my = Math.floor(y / modulePx) - quiet;
    for (let x = 0; x < total; x++) {
      const mx = Math.floor(x / modulePx) - quiet;
      const dark =
        mx >= 0 && my >= 0 && mx < matrix.size && my < matrix.size && matrix.get(mx, my);
      const c = dark ? fg : bg;
      const i = (y * total + x) * 4;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, total, total);
}
