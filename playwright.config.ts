import path from "node:path";
import { defineConfig } from "@playwright/test";

const authFile = path.join("playwright", ".auth", "user.json");

export default defineConfig({
  testDir: "./playwright",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  use: {
    headless: true
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "e2e",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: authFile,
        headless: true
      }
    }
  ]
});
