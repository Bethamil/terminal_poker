import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@terminal-poker/shared-types": path.resolve(__dirname, "../../packages/shared-types/src/index.ts")
    }
  },
  server: {
    port: 5173
  }
});
