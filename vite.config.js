import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  server: {
    host: "0.0.0.0",
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
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/motion")) {
            return "vendor-motion";
          }
          if (
            id.includes("node_modules/@radix-ui") ||
            id.includes("node_modules/lucide-react") ||
            id.includes("node_modules/@dnd-kit")
          ) {
            return "vendor-ui";
          }
          if (id.includes("node_modules/qrcode") || id.includes("node_modules/dompurify")) {
            return "vendor-qr";
          }
        },
      },
    },
    copyPublicDir: true,
    chunkSizeWarningLimit: 600,
  },
});
