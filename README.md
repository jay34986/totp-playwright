# GitHub CopilotでTOTP認証がかかったWebページの動作確認

CloudFront + Cognito + S3 で、パスワード認証 + TOTP認証を通過しないと「認証済みコンテンツ」が表示されない検証用ページを AWS CDK(TypeScript) で構築します。  
その後、Node.js + otplib + Playwright で E2E テストを実行し、ログイン突破を自動確認します。

## 構成（低コスト検証向け）

![構成図](./image/totp-playwright.svg)

- S3: 静的ファイル配置バケット（インターネットからの直接アクセスはOACで保護）
- CloudFront: S3 オリジンを OAC で配信
- Cognito User Pool: MFA 必須、SOFTWARE_TOKEN_MFA(TOTP) 有効
- Cognito Hosted UI: ログイン画面（ユーザー名/パスワード + TOTP）
- Playwright: Hosted UI に対して認証を自動化

コストを抑えるため、検証構成では次を省略しています。

- WAF
- CloudFront/S3 のアクセスログ

上記は cdk-nag で suppression 理由をコードに明示しています。

## 前提

- Node.js 20 以上
- AWS CLI の認証済みプロファイル
- 東京リージョン（ap-northeast-1）

## セットアップ

1. 依存をインストールします。

   ```bash
   npm install
   ```

2. Playwright のブラウザをインストールします。

   ```bash
   npx playwright install --with-deps chromium
   ```

3. CDK を synth / deploy します。

   ```bash
   npm run cdk:synth
   npm run cdk:deploy -- --parameters CognitoDomainPrefix=<global-unique-prefix>
   ```

## 初回ユーザー登録（ユーザー作業）

初回のユーザー登録と TOTP 登録は手動で行います。

1. CloudFormation 出力の `CognitoHostedUiDomain` を開く
2. `https://<domain>/signup?client_id=<UserPoolClientId>&response_type=token&scope=openid+email+profile&redirect_uri=<CloudFrontUrl>/`
3. サインアップ後、Hosted UI の案内に従って TOTP を登録
4. 認証アプリに表示されるシークレット（Base32）を安全な場所に控える

## シークレット保管方針

検証用途の最小構成として、ローカル `.env` に保存する方法を採用しています。

1. `.env.example` を `.env` にコピー
2. 値を設定

   ```bash
   cp .env.example .env
   ```

   `.env` の設定項目:

   - `BASE_URL` : CloudFrontUrl
   - `COGNITO_DOMAIN` : CognitoHostedUiDomain
   - `COGNITO_CLIENT_ID` : UserPoolClientId
   - `TEST_USERNAME` / `TEST_PASSWORD`
   - `TOTP_SECRET` : 初回登録時に取得した Base32 シークレット

   本番運用では `.env` ではなく、次のいずれかを推奨します。

   - AWS Secrets Manager
   - SSM Parameter Store (SecureString)
   - CI のシークレットストア

## テスト実行

1. 静的解析

   ```bash
   npm run lint
   ```

2. ユニットテスト（CDK テンプレート検証）

   ```bash
   npm run test:unit
   ```

3. GitHub Copilot への依頼文例

   Copilot に認証突破を含めて実行してもらう前提で、次のように依頼します。

   認証セットアップだけを実行したい場合:

   ```text
   .env の内容を使って Playwright の認証セットアップを実行してください。
   Cognito Hosted UI でパスワード認証と TOTP 認証を通過し、storageState を作成してください。
   実行コマンドは npm run test:auth を使ってください。
   ```

   認証突破を含めて E2E を最後まで実行したい場合:

   ```text
   .env の内容を使って E2E テストを実行してください。
   Playwright で Cognito Hosted UI のパスワード認証と TOTP 認証を突破し、その後に保護ページの表示確認まで実施してください。
   実行コマンドは npm run test:e2e を使ってください。
   ```

   ブラウザを見ながら Copilot に確認させたい場合:

   ```text
   .env の内容を使って headed モードの E2E テストを実行してください。
   Playwright で Cognito Hosted UI のログインと TOTP 認証を通し、画面遷移を確認しながら検証してください。
   実行コマンドは npm run test:e2e:headed を使ってください。
   ```

4. 認証セットアップだけを実行したい場合

   ```bash
   npm run test:auth
   ```

   このコマンドは Cognito Hosted UI でのユーザー名/パスワード入力と TOTP 入力を実行し、認証済みの `storageState` を `playwright/.auth/user.json` に保存します。

5. E2E テスト（Playwright + otplib）

   ```bash
   npm run test:e2e
   ```

   `test:e2e` は内部で `setup` project を先に走らせるため、Copilot は Node から Playwright を起動するだけで認証突破まで完了できます。

   ブラウザを見ながら確認したい場合は次を使います。

   ```bash
   npm run test:e2e:headed
   ```

   成功時は、次を確認します。

   - Hosted UI でユーザー名/パスワード入力
   - TOTP コード入力
   - 認証済み state を `playwright/.auth/user.json` に保存
   - CloudFront ページに戻った後に「認証済み」メッセージが可視

## 主要ファイル

- `bin/totp-playwright.ts` : CDK App エントリ
- `lib/totp-playwright-stack.ts` : CloudFront/S3/Cognito スタック
- `web/index.html` : 検証ページ
- `playwright/auth.setup.ts` : Copilot 実行向けの認証セットアップ
- `playwright/auth.shared.ts` : 認証補助ロジック
- `playwright/totp-login.spec.ts` : 認証済み state を再利用する E2E
- `test/totp-playwright-stack.test.ts` : CDK ユニットテスト

## 後片付け

```bash
npm run cdk:destroy
```
