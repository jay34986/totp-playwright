import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { authStatusText, openProtectedPage, readEnv } from "./auth.shared.js";

test("Cognitoログインでパスワード + TOTPを通過して保護コンテンツを表示する", async ({ page }) => {
  const env = readEnv();
  const screenshotDir = path.join("playwright", "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  await openProtectedPage(page, env);

  await expect(page.getByText(authStatusText, { exact: true })).toBeVisible();
  await page.screenshot({
    path: path.join(screenshotDir, "05-e2e-authenticated-content.png"),
    fullPage: true
  });
});
