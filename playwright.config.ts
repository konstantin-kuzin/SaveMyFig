import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".userData/.env") });

export default defineConfig({
  testDir: "./automations",
  outputDir: './.userData/backup-results',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: (Number(process.env.WAIT_TIMEOUT) || 0) + 120 * 1000,
  reporter: [["list"], ["html", { outputFolder: './.userData/backup-reports', open: "never" }]],
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "download",
      use: { ...devices["Desktop Chrome"], storageState: ".userData/user.json" },
      dependencies: ["setup"],
    },
  ],
});
