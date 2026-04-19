import { test, expect } from "@playwright/test";
import { readEnv, seedLoginConfig } from "./auth.shared.js";

test("Cognitoログインでパスワード + TOTPを通過して保護コンテンツを表示する", async ({ page }) => {
  const env = readEnv();

  await page.goto(env.BASE_URL, { waitUntil: "domcontentloaded" });
  await seedLoginConfig(page, env);
  await page.reload();

  await expect(page.getByText("認証済み: パスワード + TOTPを通過しました。", { exact: true })).toBeVisible();
});
