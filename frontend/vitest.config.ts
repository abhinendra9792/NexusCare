import { defineConfig, mergeConfig } from "vitest/config"
import viteConfig from "./vite.config"

// Reuse the app's Vite config (React plugin, Tailwind, the "@/" alias) and add test settings.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
    },
  }),
)