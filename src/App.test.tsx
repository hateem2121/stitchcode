import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App component smoke tests", () => {
  it("renders main header, navigation, and studio section", async () => {
    render(<App />);

    // Check title and badges
    expect(screen.getByText("QR code studio")).toBeInTheDocument();
    expect(screen.getByText("no signup")).toBeInTheDocument();
    expect(screen.getByText("works offline")).toBeInTheDocument();

    // Check payload type tabs
    expect(screen.getByText("Link")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
    expect(screen.getByText("Card")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
  });
});
