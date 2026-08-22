import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviewPanel } from "./PreviewPanel";
import { DEFAULT_STYLE } from "./StylePanel";
import { createMatrix } from "../lib/qr";
import { ToastProvider } from "./ui";

describe("PreviewPanel component", () => {
  const matrix = createMatrix("https://RUN-APPAREL.github.io/stitchcode", "M");
  const onAutoFix = vi.fn();

  it("renders preview card, substrate selector, and action buttons", () => {
    render(
      <ToastProvider>
        <PreviewPanel
          payload="https://RUN-APPAREL.github.io/stitchcode"
          matrix={matrix}
          style={DEFAULT_STYLE}
          filenameBase="stitchcode-test"
          logoGrid={null}
          logoN={0}
          onAutoFix={onAutoFix}
        />
      </ToastProvider>,
    );

    // Substrate pills
    expect(screen.getByText("White")).toBeInTheDocument();
    expect(screen.getByText("Kraft")).toBeInTheDocument();
    expect(screen.getByText("Knit")).toBeInTheDocument();

    // Export buttons
    expect(screen.getByText("Save image")).toBeInTheDocument();
    expect(screen.getByText("Save SVG")).toBeInTheDocument();
  });
});
