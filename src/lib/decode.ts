/**
 * QR decoding for the "we scanned it for you" self-check.
 *
 * Uses the native BarcodeDetector API when the browser provides it and falls
 * back to the `barcode-detector` ponyfill (ZXing-C++ compiled to WASM) where
 * it doesn't (Firefox, Safari < 17 / disabled-by-default). The WASM payload
 * (~1 MB) is dynamically imported so it never sits on the critical path.
 *
 * If the code doesn't read at normal polarity, one inverted pass is tried —
 * some exports legitimately use a light-on-dark palette.
 */

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageData): Promise<Array<DetectedBarcode>>;
}

type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

let detectorPromise: Promise<BarcodeDetectorLike> | null = null;

function getDetector(): Promise<BarcodeDetectorLike> {
  detectorPromise ??= (async () => {
    const native = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (native) return new native({ formats: ["qr_code"] });
    const { BarcodeDetector } = await import("barcode-detector");
    return new BarcodeDetector({ formats: ["qr_code"] });
  })();
  return detectorPromise;
}

/** Invert luminance of an ImageData copy (alpha preserved). */
function invert(image: ImageData): ImageData {
  const out = new Uint8ClampedArray(image.data);
  for (let i = 0; i < out.length; i += 4) {
    out[i] = 255 - out[i];
    out[i + 1] = 255 - out[i + 1];
    out[i + 2] = 255 - out[i + 2];
  }
  return new ImageData(out, image.width, image.height);
}

export async function decodeQR(image: ImageData): Promise<string | null> {
  try {
    const detector = await getDetector();
    const found = await detector.detect(image);
    if (found.length > 0) return found[0].rawValue;
    const inverted = await detector.detect(invert(image));
    if (inverted.length > 0) return inverted[0].rawValue;
    return null;
  } catch {
    // Decoder unavailable (e.g. WASM blocked) — report "cannot decode".
    return null;
  }
}
