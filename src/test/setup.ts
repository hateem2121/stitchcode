import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";

// Node ≥22 exposes an experimental `localStorage` global that is present but
// inert without --localstorage-file, shadowing jsdom's implementation once
// vitest populates globals. Provide an in-memory Storage when one is missing.
if (typeof window !== "undefined" && !window.localStorage) {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => Array.from(store.keys())[i] ?? null,
    removeItem: (k) => void store.delete(k),
    setItem: (k, v) => void store.set(k, String(v)),
  };
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
}

// Polyfill matchMedia for jsdom
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Polyfill ResizeObserver for jsdom
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill IntersectionObserver for jsdom
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: Array<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// Ensure Web Crypto API is available in test environment
if (typeof window !== "undefined" && !window.crypto?.subtle) {
  Object.defineProperty(window, "crypto", {
    value: webcrypto,
    writable: true,
  });
}

// Mock HTMLCanvasElement context for rendering logic in jsdom
if (typeof HTMLCanvasElement !== "undefined") {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const mockContext2d = {
    canvas: null as unknown as HTMLCanvasElement,
    fillStyle: "#000000",
    strokeStyle: "#000000",
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    drawImage: () => {},
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: () => {},
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    setTransform: () => {},
    resetTransform: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    rotate: () => {},
    translate: () => {},
    roundRect: () => {},
  };

  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextType: string,
  ) {
    if (contextType === "2d") {
      mockContext2d.canvas = this;
      return mockContext2d as unknown as CanvasRenderingContext2D;
    }
    return (
      originalGetContext as unknown as (
        this: HTMLCanvasElement,
        t: string,
      ) => CanvasRenderingContext2D | null
    ).call(this, contextType);
  } as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = function () {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  };
}
