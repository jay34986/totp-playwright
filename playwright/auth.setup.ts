import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test as setup, expect } from "@playwright/test";
import {
  authStatusText,
  fillPasswordAndSubmit,
  fillTotpAndSubmit,
  openProtectedPage,
  readEnv,
} from "./auth.shared.js";

const authFile = path.join("playwright", ".auth", "user.json");
const screenshotDir = path.join("playwright", "screenshots");

const takeTransitionScreenshot = async (page: Page, filename: string) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotDir, filename),
    fullPage: true
  });
};

setup("Cognito Hosted UI で認証済み state を作成する", async ({ page }) => {
  const env = readEnv();
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await openProtectedPage(page, env);
  await takeTransitionScreenshot(page, "01-protected-page-before-login.png");

  await page.getByRole("button", { name: "Cognitoでログイン" }).click();
  await expect(page).toHaveURL(/amazoncognito\.com/);
  await takeTransitionScreenshot(page, "02-cognito-hosted-ui-login.png");

  await fillPasswordAndSubmit(page, env.TEST_USERNAME, env.TEST_PASSWORD);
  await page.waitForLoadState("domcontentloaded");
  await takeTransitionScreenshot(page, "03-cognito-totp-challenge.png");
  await fillTotpAndSubmit(page, env.TOTP_SECRET);

  await expect(
    page,
    "Cognito Hosted UI から CloudFront 側へ戻っていること"
  ).toHaveURL(new RegExp(env.BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.getByText(authStatusText, { exact: true })).toBeVisible();
  await takeTransitionScreenshot(page, "04-authenticated-page-after-totp.png");

  await page.context().storageState({ path: authFile });
});