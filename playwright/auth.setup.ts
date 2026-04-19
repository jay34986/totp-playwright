import fs from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import {
  fillPasswordAndSubmit,
  fillTotpAndSubmit,
  readEnv,
  seedLoginConfig
} from "./auth.shared.js";

const authFile = path.join("playwright", ".auth", "user.json");

setup("Cognito Hosted UI で認証済み state を作成する", async ({ page }) => {
  const env = readEnv();
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto(env.BASE_URL, { waitUntil: "domcontentloaded" });
  await seedLoginConfig(page, env);
  await page.reload();

  await page.getByRole("button", { name: "Cognitoでログイン" }).click();
  await expect(page).toHaveURL(/amazoncognito\.com/);

  await fillPasswordAndSubmit(page, env.TEST_USERNAME, env.TEST_PASSWORD);
  await fillTotpAndSubmit(page, env.TOTP_SECRET);

  await expect(
    page,
    "Cognito Hosted UI から CloudFront 側へ戻っていること"
  ).toHaveURL(new RegExp(env.BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(page.getByText("認証済み: パスワード + TOTPを通過しました。", { exact: true })).toBeVisible();

  await page.context().storageState({ path: authFile });
});