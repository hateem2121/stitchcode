import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLogoGrid, type LogoGridParams } from "./useLogoGrid";
import { createMatrix } from "./qr";

describe("useLogoGrid.ts", () => {
  const defaultParams: LogoGridParams = {
    scale: 0.3,
    threshold: 0.5,
    edge: "crisp",
    bg: "#ffffff",
    mode: "inlay",
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
});
