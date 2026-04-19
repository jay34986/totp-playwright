import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { TotpPlaywrightStack } from "../lib/totp-playwright-stack.js";

describe("TotpPlaywrightStack", () => {
  it("CloudFront, S3, Cognito resources are created", () => {
    const app = new cdk.App();
    const stack = new TotpPlaywrightStack(app, "TestStack", {
      env: { region: "ap-northeast-1" }
    });

    const template = Template.fromStack(stack);
    assert.doesNotThrow(() => template.resourceCountIs("AWS::CloudFront::Distribution", 1));
    assert.doesNotThrow(() => template.resourceCountIs("AWS::S3::Bucket", 1));
    assert.doesNotThrow(() => template.resourceCountIs("AWS::Cognito::UserPool", 1));
    assert.doesNotThrow(() => template.resourceCountIs("AWS::Cognito::UserPoolClient", 1));
    assert.doesNotThrow(() => template.resourceCountIs("AWS::Cognito::UserPoolDomain", 1));
  });

  it("Cognito MFA is required", () => {
    const app = new cdk.App();
    const stack = new TotpPlaywrightStack(app, "MfaStack", {
      env: { region: "ap-northeast-1" }
    });

    const template = Template.fromStack(stack);
    assert.doesNotThrow(() =>
      template.hasResourceProperties("AWS::Cognito::UserPool", {
        MfaConfiguration: "ON",
        EnabledMfas: ["SOFTWARE_TOKEN_MFA"]
      })
    );
  });
});
