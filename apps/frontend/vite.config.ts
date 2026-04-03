import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const devBackendUrl = env.VITE_DEV_BACKEND_URL || "http://localhost:4000";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@terminal-poker/shared-types": path.resolve(__dirname, "../../packages/shared-types/src/index.ts")
      }
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: devBackendUrl,
          changeOrigin: true
        },
        "/socket.io": {
          target: devBackendUrl,
          changeOrigin: true,
          ws: true
        },
        "/healthz": {
          target: devBackendUrl,
          changeOrigin: true
        },
        "/readyz": {
          target: devBackendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
