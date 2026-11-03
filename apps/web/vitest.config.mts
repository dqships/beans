import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The same aliases as tsconfig.json.
    alias: {
      "@/": fileURLToPath(new URL("./src/", import.meta.url)),
      "@convex/": fileURLToPath(new URL("../../convex/", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.test.ts", "scripts/**/*.test.ts"] },
});
