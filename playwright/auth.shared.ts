import { type Locator, type Page } from "@playwright/test";
import dotenv from "dotenv";
import { authenticator } from "otplib";

dotenv.config();

const requiredEnvKeys = [
  "BASE_URL",
  "COGNITO_DOMAIN",
  "COGNITO_CLIENT_ID",
  "TEST_USERNAME",
  "TEST_PASSWORD",
  "TOTP_SECRET"
] as const;

export type AuthEnv = Record<(typeof requiredEnvKeys)[number], string>;

export const authStatusText = "認証済み: パスワード + TOTPを通過しました。";

export const getMissingEnvKeys = (values: Partial<AuthEnv>): string[] =>
  requiredEnvKeys.filter((key) => (values[key] ?? "").length === 0);

export const readEnv = (): AuthEnv => {
  const values = Object.fromEntries(
    requiredEnvKeys.map((key) => [key, process.env[key] ?? ""])
  ) as AuthEnv;

  const missing = getMissingEnvKeys(values);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  return values;
};

export const seedLoginConfig = async (page: Page, env: AuthEnv) => {
  await page.evaluate(
    ({ domain, clientId }) => {
      localStorage.setItem("COGNITO_DOMAIN", domain);
      localStorage.setItem("COGNITO_CLIENT_ID", clientId);
    },
    { domain: env.COGNITO_DOMAIN, clientId: env.COGNITO_CLIENT_ID }
  );
};

export const openProtectedPage = async (page: Page, env: AuthEnv): Promise<void> => {
  await page.goto(env.BASE_URL, { waitUntil: "domcontentloaded" });
  await seedLoginConfig(page, env);
  await page.reload({ waitUntil: "domcontentloaded" });
};

const firstVisible = async (candidates: Locator[]): Promise<Locator> => {
  for (const candidate of candidates) {
    if (await candidate.first().isVisible().catch(() => false)) {
      return candidate.first();
    }
  }

  throw new Error("No visible element found for candidate selectors.");
};

export const fillPasswordAndSubmit = async (page: Page, username: string, password: string) => {
  const usernameInput = await firstVisible([
    page.getByLabel(/username|user name|email/i),
    page.locator('input[name="username"]'),
    page.locator('input[type="email"]')
  ]);
  await usernameInput.fill(username);

  const passwordInput = await firstVisible([
    page.getByLabel(/password/i),
    page.locator('input[name="password"]'),
    page.locator('input[type="password"]')
  ]);
  await passwordInput.fill(password);

  const submitButton = await firstVisible([
    page.getByRole("button", { name: /sign in|log in|continue/i }),
    page.locator('button[type="submit"]'),
    page.locator('input[type="submit"]')
  ]);
  await submitButton.click();
};

export const fillTotpAndSubmit = async (page: Page, secret: string) => {
  const token = authenticator.generate(secret);

  const otpInput = await firstVisible([
    page.getByLabel(/code|otp|verification/i),
    page.locator('input[name="totpCode"]'),
    page.locator('input[name="code"]'),
    page.locator('input[inputmode="numeric"]')
  ]);

  await otpInput.fill(token);

  const verifyButton = await firstVisible([
    page.getByRole("button", { name: /verify|confirm|continue|submit/i }),
    page.locator('button[type="submit"]'),
    page.locator('input[type="submit"]')
  ]);
  await verifyButton.click();
};