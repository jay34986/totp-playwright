import * as cdk from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export class TotpPlaywrightStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cognitoDomainPrefix = new cdk.CfnParameter(this, "CognitoDomainPrefix", {
      type: "String",
      description: "Globally unique domain prefix for Cognito hosted UI",
      minLength: 3,
      maxLength: 63,
      allowedPattern: "^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$"
    });

    const websiteBucket = new s3.Bucket(this, "TotpProtectedSiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    const distribution = new cloudfront.Distribution(this, "TotpProtectedSiteDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: "index.html",
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100
    });

    const userPool = new cognito.UserPool(this, "TotpUserPool", {
      signInAliases: {
        email: true
      },
      selfSignUpEnabled: true,
      mfa: cognito.Mfa.REQUIRED,
      mfaSecondFactor: {
        otp: true,
        sms: false
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true
      }
    });

    const callbackUrl = `https://${distribution.distributionDomainName}/`;

    const userPoolClient = new cognito.UserPoolClient(this, "TotpUserPoolClient", {
      userPool,
      generateSecret: false,
      preventUserExistenceErrors: true,
      authFlows: {
        userPassword: true
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true
        },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE
        ],
        callbackUrls: [callbackUrl],
        logoutUrls: [callbackUrl]
      }
    });

    const userPoolDomain = new cognito.UserPoolDomain(this, "TotpUserPoolDomain", {
      userPool,
      cognitoDomain: {
        domainPrefix: cognitoDomainPrefix.valueAsString
      }
    });

    new s3deploy.BucketDeployment(this, "DeployWebAssets", {
      destinationBucket: websiteBucket,
      sources: [s3deploy.Source.asset("./web")]
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`
    });

    new cdk.CfnOutput(this, "CognitoHostedUiDomain", {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId
    });

    NagSuppressions.addResourceSuppressions(
      [distribution, websiteBucket],
      [
        {
          id: "AwsSolutions-CFR1",
          reason: "This is a temporary verification stack and geo restrictions are out of scope."
        },
        {
          id: "AwsSolutions-CFR2",
          reason: "WAF is intentionally omitted to keep recurring cost low for short-term verification."
        },
        {
          id: "AwsSolutions-CFR3",
          reason: "CloudFront access logging is omitted to minimize cost in disposable validation environments."
        },
        {
          id: "AwsSolutions-CFR4",
          reason: "The default CloudFront certificate is used to avoid ACM certificate cost/management in this temporary validation stack."
        },
        {
          id: "AwsSolutions-S1",
          reason: "S3 access logs are omitted to minimize storage and request costs for validation use only."
        }
      ],
      true
    );

    NagSuppressions.addResourceSuppressions(userPool, [
      {
        id: "AwsSolutions-COG3",
        reason: "Advanced Security Mode has additional recurring charges and is excluded for low-cost validation only."
      }
    ]);

    const bucketDeploymentPathPrefix =
      `/${this.node.id}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C`;

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `${bucketDeploymentPathPrefix}/Resource`,
      [
        {
          id: "AwsSolutions-L1",
          reason: "CDK-managed custom resource runtime is controlled by aws-cdk-lib and not directly configurable here."
        }
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `${bucketDeploymentPathPrefix}/ServiceRole/Resource`,
      [
        {
          id: "AwsSolutions-IAM4",
          reason: "CDK BucketDeployment uses AWS managed policy for helper Lambda basic logging.",
          appliesTo: [
            "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
          ]
        }
      ]
    );

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      `${bucketDeploymentPathPrefix}/ServiceRole/DefaultPolicy/Resource`,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "CDK BucketDeployment requires scoped wildcard actions and object ARNs for sync/delete behavior.",
          appliesTo: [
            "Action::s3:GetObject*",
            "Action::s3:GetBucket*",
            "Action::s3:List*",
            "Action::s3:DeleteObject*",
            "Action::s3:Abort*",
            "Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-<AWS::AccountId>-ap-northeast-1/*",
            "Resource::<TotpProtectedSiteBucketEBD4EF83.Arn>/*"
          ]
        }
      ]
    );
  }
}
