#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { TotpPlaywrightStack } from "../lib/totp-playwright-stack.js";

const app = new cdk.App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

new TotpPlaywrightStack(app, "TotpPlaywrightStack", {
  env: {
    region: "ap-northeast-1"
  }
});
