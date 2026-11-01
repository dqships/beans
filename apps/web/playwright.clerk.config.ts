import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Real Clerk sign-in against the hosted development instances. Kept apart from
// the main suite, which needs a dev server in test sign-in mode. Without keys
// the setup and the test both skip, so CI stays green.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const port = Number(process.env.E2E_CLERK_PORT ?? 3100);
// `pnpm --filter @beans/web e2e:clerk:prod` runs against a production build, with the production security headers.
const serve = process.env.E2E_CLERK_PROD ? "next start" : "next dev";

export default defineConfig({
  testDir: "./e2e-clerk",
  outputDir: "./test-results/clerk",
  reporter: process.env.CI ? "github" : "list",
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "clerk setup", testMatch: /global\.setup\.ts/ },
    {
      name: "clerk",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
      testMatch: /\.spec\.ts/,
      dependencies: ["clerk setup"],
    },
  ],
  webServer: {
    command: `pnpm exec ${serve} --port ${port}`,
    url: `http://localhost:${port}/sign-in`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
