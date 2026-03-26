import { 
  CloudFrontClient, 
  CreateDistributionCommand, 
  GetDistributionCommand
} from "@aws-sdk/client-cloudfront";
import { env } from "../src/config/env";

const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION });

async function run() {
    console.log("Setting up CloudFront Distribution...");
    
    try {
        const distributionId = (process.env as any).CLOUDFRONT_DISTRIBUTION_ID;
        let exists = false;
        if (distributionId) {
            try {
                await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }));
                exists = true;
            } catch {}
        }

        if (exists) {
            console.log("CloudFront already configured. To update, use the AWS Console/CLI.");
        } else {
            console.log("Creating new CloudFront Distribution (Targeting Lambda URL)...");
            
            // Note: You must provide your Lambda Function URL from the deploy-lambda step
            const lambdaFunctionUrl = (process.env as any).AWS_LAMBDA_FUNCTION_URL || "your-lambda-id.lambda-url.region.on.aws";

            await cloudFrontClient.send(new CreateDistributionCommand({
                DistributionConfig: {
                    CallerReference: Date.now().toString(),
                    Comment: "Dynamic Image Transformation Engine",
                    Enabled: true,
                    Origins: {
                        Quantity: 1,
                        Items: [{
                            Id: "ImageLambdaOrigin",
                            DomainName: lambdaFunctionUrl.replace("https://", ""),
                            CustomOriginConfig: {
                                HTTPPort: 80,
                                HTTPSPort: 443,
                                OriginProtocolPolicy: "https-only",
                            }
                        }]
                    },
                    DefaultCacheBehavior: {
                        TargetOriginId: "ImageLambdaOrigin",
                        ForwardedValues: {
                            QueryString: true, // IMPORTANT: Forward w, h, f params
                            Cookies: { Forward: "none" },
                            Headers: { Quantity: 0, Items: [] }
                        },
                        TrustedSigners: { Quantity: 0, Enabled: false },
                        ViewerProtocolPolicy: "redirect-to-https",
                        MinTTL: 0,
                        DefaultTTL: 86400, // 24 hours
                        MaxTTL: 31536000, // 1 year
                    }
                }
            }));

            console.log("CloudFront Distribution successfully created!");
            console.log("Wait 5-10 minutes for global propagation.");
        }
    } catch (error: any) {
        console.error("CloudFront Setup error:", error.message);
    }
}

run();
