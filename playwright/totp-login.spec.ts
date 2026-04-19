import { test, expect } from "@playwright/test";
import { authStatusText, openProtectedPage, readEnv } from "./auth.shared.js";

test("Cognitoログインでパスワード + TOTPを通過して保護コンテンツを表示する", async ({ page }) => {
  const env = readEnv();

  await openProtectedPage(page, env);

  await expect(page.getByText(authStatusText, { exact: true })).toBeVisible();
});
