import { describe, it, expect } from "vitest";
import { decodeQR } from "./decode";

describe("decode.ts", () => {
  it("should return null for empty/blank image data", async () => {
    const width = 100;
    const height = 100;
    const data = new Uint8ClampedArray(width * height * 4);
    const imageData = { data, width, height } as ImageData;

    const result = await decodeQR(imageData);
    expect(result).toBeNull();
  });

  // Real matrix→pixels→decoder round-trip tests land with the
  // barcode-detector swap (see decode.roundtrip.test.ts).
});
