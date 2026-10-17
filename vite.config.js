import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Emits sw.js with its VERSION stamped from package.json at build time —
 * the manual bump in the worker source could (and did) drift behind
 * releases, leaving PWA users on stale caches.
 */
function serviceWorkerVersionPlugin() {
  let version = "0.0.0";
  let template = "";
  return {
    name: "stitchcode-sw-version",
    apply: "build",
    buildStart() {
      version = JSON.parse(readFileSync("./package.json", "utf8")).version;
      template = readFileSync("./scripts/sw.template.js", "utf8");
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: template.replace("__SW_VERSION__", `v${version}`),
      });
    },
  };
}

/**
 * The production index.html ships a strict CSP meta tag. In dev, Vite injects
 * an inline HMR/react-refresh preamble that CSP would block — so during
 * `vite` (serve mode only) this plugin swaps the meta tag for a relaxed one.
 */
function devCspPlugin() {
  return {
    name: "stitchcode-dev-csp",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(
        /<meta http-equiv="Content-Security-Policy"[^>]*>/,
        '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' blob:; style-src \'self\' \'unsafe-inline\'; img-src \'self\' blob: data:; font-src \'self\'; connect-src \'self\' ws: http://localhost:* http://127.0.0.1:*; base-uri \'self\'; object-src \'none\';" />',
      );
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      // React Compiler v1 — automatic memoisation (keeps Babel in the
      // pipeline just for this plugin; Oxc handles the rest).
      babel: { plugins: [["babel-plugin-react-compiler", {}]] },
    }),
    tailwindcss(),
    devCspPlugin(),
    serviceWorkerVersionPlugin(),
  ],
  base: "./",
  server: {
    // localhost only — use `vite --host` deliberately if you need LAN access
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: "index.html",
      },
      output: {
        // Whole-path-segment matching (the old substring `includes` also
        // captured unrelated packages). jsQR group disappears with the
        // barcode-detector swap.
        advancedChunks: {
          groups: [
            { name: "vendor-react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: "vendor-motion", test: /node_modules[\\/](motion|framer-motion)[\\/]/ },
            { name: "vendor-ui", test: /node_modules[\\/](@radix-ui|lucide-react|@dnd-kit)[\\/]/ },
            { name: "vendor-qr", test: /node_modules[\\/](qrcode|dompurify|barcode-detector|zxing-wasm)[\\/]/ },
          ],
        },
      },
    },
    copyPublicDir: true,
    chunkSizeWarningLimit: 600,
  },
});
