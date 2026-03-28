import { CloudFrontClient, GetDistributionCommand } from "@aws-sdk/client-cloudfront";
import { env } from "../../src/config/env";

const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION });

async function run() {
    console.log("\n\x1b[31m\x1b[1m=== CloudFront Decommissioner ===\x1b[0m");
    const distributionId = env.CLOUDFRONT_DISTRIBUTION_ID;

    if (!distributionId) {
        console.log("No CLOUDFRONT_DISTRIBUTION_ID found in environment. Skipping.");
        return;
    }

    console.log(`Target Distribution: ${distributionId}`);
    console.log("\x1b[33mWarning: CloudFront distributions require manual 'Disable' and ~20-minute wait before they can be deleted.\x1b[0m");
    
    try {
        const { Distribution } = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }));
        
        if (Distribution?.DistributionConfig?.Enabled) {
            console.log("\n\x1b[33mDistribution is currently ENABLED.\x1b[0m You must manually disable it in the AWS Console first.");
        } else {
            console.log("\n\x1b[32mDistribution is DISABLED.\x1b[0m You can now manually delete it in the AWS Console.");
        }
        
        console.log("\nManual Steps:");
        console.log("1. Go to AWS CloudFront Console.");
        console.log(`2. Find Distribution: ${distributionId}`);
        console.log("3. Select it and click 'Disable' (if not already disabled).");
        console.log("4. Wait until Status is 'Deployed' (this takes ~15-20 min).");
        console.log("5. Once disabled, select it again and click 'Delete'.");
    } catch (e: any) {
        console.error("CloudFront Check Error:", e.message);
    }
}

run();
