import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { getMissingEnvKeys, readEnv } from "../playwright/auth.shared.js";

const authEnvSnapshot = {
  BASE_URL: process.env.BASE_URL,
  COGNITO_DOMAIN: process.env.COGNITO_DOMAIN,
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  TEST_USERNAME: process.env.TEST_USERNAME,
  TEST_PASSWORD: process.env.TEST_PASSWORD,
  TOTP_SECRET: process.env.TOTP_SECRET
};

const clearAuthEnv = (): void => {
  delete process.env.BASE_URL;
  delete process.env.COGNITO_DOMAIN;
  delete process.env.COGNITO_CLIENT_ID;
  delete process.env.TEST_USERNAME;
  delete process.env.TEST_PASSWORD;
  delete process.env.TOTP_SECRET;
};

afterEach(() => {
  clearAuthEnv();

  for (const [key, value] of Object.entries(authEnvSnapshot)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
});

describe("auth.shared", () => {
  it("missing env vars を定義順で返す", () => {
    assert.deepEqual(
      getMissingEnvKeys({
        BASE_URL: "https://example.com",
        COGNITO_DOMAIN: "",
        COGNITO_CLIENT_ID: "client-id",
        TEST_USERNAME: "tester@example.com",
        TEST_PASSWORD: "password",
        TOTP_SECRET: ""
      }),
      ["COGNITO_DOMAIN", "TOTP_SECRET"]
    );
  });

  it("必要な env vars を読み込む", () => {
    clearAuthEnv();
    process.env.BASE_URL = "https://example.com";
    process.env.COGNITO_DOMAIN = "https://example.auth.ap-northeast-1.amazoncognito.com";
    process.env.COGNITO_CLIENT_ID = "client-id";
    process.env.TEST_USERNAME = "tester@example.com";
    process.env.TEST_PASSWORD = "password";
    process.env.TOTP_SECRET = "JBSWY3DPEHPK3PXP";

    assert.deepEqual(readEnv(), {
      BASE_URL: "https://example.com",
      COGNITO_DOMAIN: "https://example.auth.ap-northeast-1.amazoncognito.com",
      COGNITO_CLIENT_ID: "client-id",
      TEST_USERNAME: "tester@example.com",
      TEST_PASSWORD: "password",
      TOTP_SECRET: "JBSWY3DPEHPK3PXP"
    });
  });

  it("env vars が不足しているときは例外を投げる", () => {
    clearAuthEnv();
    process.env.BASE_URL = "https://example.com";

    assert.throws(
      () => readEnv(),
      /Missing required env vars: COGNITO_DOMAIN, COGNITO_CLIENT_ID, TEST_USERNAME, TEST_PASSWORD, TOTP_SECRET/
    );
  });
});