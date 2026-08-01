import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: [
    "hover-artifact.e2e.ts",
    "mobile-responsive.e2e.ts",
    "password-recovery.e2e.ts",
  ],
  fullyParallel: false,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://localhost:5173",
    colorScheme: "dark",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1400, height: 780 },
  },
  webServer: {
    command: "npm run dev",
    reuseExistingServer: true,
    timeout: 30_000,
    url: "http://localhost:5173",
  },
});
