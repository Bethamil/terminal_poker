import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  outDir: "dist",
  platform: "node",
  format: ["esm"],
  bundle: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  target: "node18",
  noExternal: ["@terminal-poker/shared-types"],
});
