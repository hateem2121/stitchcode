import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLogoGrid, type LogoGridParams, type LogoGridState } from "./useLogoGrid";
import { createMatrix } from "./qr";

/* jsdom cannot decode images, so the rasteriser is mocked with a synthetic
   grid — these tests verify WHICH inputs trigger re-rasterisation (the old
   params cache skipped runs when only the logo image or matrix changed). */
vi.mock("./qr", async (importOriginal) => {
  const orig = await importOriginal<typeof import("./qr")>();
  return {
    ...orig,
    logoToGrid: vi.fn(async (_logo: string, n: number) => {
      const grid = new Uint8Array(n * n);
      grid.fill(1, 0, Math.floor(n * n) / 2);
      return grid;
    }),
  };
});

describe("useLogoGrid.ts", () => {
  const defaultParams: LogoGridParams = {
    scale: 0.3,
    threshold: 0.5,
    edge: "crisp",
    bg: "#ffffff",
    mode: "inlay",
    ec: "H",
    brightness: 1,
    contrast: 1,
    fade: 0,
  };

  it("should return idle state when logo or matrix is null", () => {
    const { result } = renderHook(() => useLogoGrid(null, null, defaultParams));
    expect(result.current.grid).toBeNull();
    expect(result.current.n).toBe(0);
    expect(result.current.warning).toBeNull();
  });

  it("should return warning on invalid logo format", async () => {
    const matrix = createMatrix("https://example.com", "M");
    const { result } = renderHook(() =>
      useLogoGrid("invalid-protocol://logo.png", matrix, defaultParams),
    );

    await waitFor(() => {
      expect(result.current.warning).toContain("Invalid logo format");
    });
  });

  it("re-rasterises when a DIFFERENT logo arrives with identical params (stale-cache regression)", async () => {
    const matrix = createMatrix("https://example.com", "H");
    const logoA = "data:image/png;base64,AAAA";
    const logoB = "data:image/png;base64,BBBB";

    const { result, rerender } = renderHook<LogoGridState, { logo: string | null }>(
      ({ logo }) => useLogoGrid(logo, matrix, defaultParams),
      { initialProps: { logo: logoA } },
    );
    await waitFor(() => expect(result.current.grid).not.toBeNull());
    expect(result.current.n).toBeGreaterThan(0);

    // remove → idle …
    rerender({ logo: null });
    expect(result.current.grid).toBeNull();

    // … then a different logo with the same params must rasterise again
    rerender({ logo: logoB });
    await waitFor(() => expect(result.current.grid).not.toBeNull());
  });

  it("re-sizes the grid when the payload grows the code (stale-cache regression)", async () => {
    const logo = "data:image/png;base64,AAAA";
    const small = createMatrix("https://example.com", "Q");
    const { result, rerender } = renderHook(
      ({ matrix }: { matrix: typeof small }) => useLogoGrid(logo, matrix, defaultParams),
      { initialProps: { matrix: small } },
    );
    await waitFor(() => expect(result.current.grid).not.toBeNull());
    const n1 = result.current.n;

    // a much longer payload → higher version → larger matrix
    const big = createMatrix(`https://example.com/${"catalogue/".repeat(12)}`, "Q");
    rerender({ matrix: big });
    await waitFor(() => expect(result.current.n).toBeGreaterThan(n1));
    // grid re-rasterised at the new geometry
    expect(result.current.grid?.length).toBe(result.current.n * result.current.n);
  });
});
