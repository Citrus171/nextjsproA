import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 120000,
  globalTeardown: "./tests/global-teardown.ts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
