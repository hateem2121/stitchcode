import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react({
      // React Compiler v1 — automatic memoisation (keeps Babel in the
      // pipeline just for this plugin; Oxc handles the rest).
      babel: { plugins: [["babel-plugin-react-compiler", {}]] },
    }),
    tailwindcss(),
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
