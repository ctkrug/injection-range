import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths so the built site works from any subpath
  // (e.g. apps.charliekrug.com/injection-range), not just the domain root.
  base: "./",
  build: {
    outDir: "dist",
  },
});
