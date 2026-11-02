import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Screens reach data through src/data hooks only.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["convex/react", "convex/browser"], message: "Use the hooks in src/data instead of calling Convex directly." },
          ],
        },
      ],
    },
  },
  {
    // The data layer and end-to-end tests may talk to Convex; screens may not.
    files: ["src/data/**", "e2e/**"],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "test-results/**", "playwright-report/**"]),
]);
