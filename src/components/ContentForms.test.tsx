import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentForms } from "./ContentForms";
import { DEFAULT_FORMS, type FormState } from "../lib/payloads";
import { ToastProvider } from "./ui";

describe("ContentForms component", () => {
  const forms: FormState = { ...DEFAULT_FORMS };
  const setType = vi.fn();
  const patch = vi.fn();

  it("renders URL form and inputs", () => {
    render(
      <ToastProvider>
        <ContentForms type="url" setType={setType} forms={forms} patch={patch} />
      </ToastProvider>,
    );
    expect(screen.getByPlaceholderText("your-site.com")).toBeInTheDocument();
  });

  it("updates URL value on change", () => {
    render(
      <ToastProvider>
        <ContentForms type="url" setType={setType} forms={forms} patch={patch} />
      </ToastProvider>,
    );
    const input = screen.getByPlaceholderText("your-site.com");
    fireEvent.change(input, { target: { value: "RUN-APPAREL.github.io/stitchcode" } });
    expect(patch).toHaveBeenCalled();
  });

  it("renders WiFi form with SSID and password fields", () => {
    render(
      <ToastProvider>
        <ContentForms type="wifi" setType={setType} forms={forms} patch={patch} />
      </ToastProvider>,
    );
    expect(screen.getByPlaceholderText("Studio-Guest")).toBeInTheDocument();
  });

  it("renders Email form with recipient field", () => {
    render(
      <ToastProvider>
        <ContentForms type="email" setType={setType} forms={forms} patch={patch} />
      </ToastProvider>,
    );
    expect(screen.getByPlaceholderText("hello@studio.co")).toBeInTheDocument();
  });
});
