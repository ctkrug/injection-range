import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      // The build output lives in site/ (see vite.config.ts); it isn't a
      // default coverage exclusion the way dist/ is, so drop it explicitly.
      exclude: [...coverageConfigDefaults.exclude, "site/**"],
    },
  },
});
