import { CloudFrontClient, GetDistributionCommand, UpdateDistributionCommand } from "@aws-sdk/client-cloudfront";
import { env } from "../../src/config/env";
import { removeFromEnv } from "../utils/env-utils";

const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION });

async function run() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.log("\n\x1b[31m\x1b[1m=== CloudFront Decommissioner ===\x1b[0m");
    const distributionId = env.CLOUDFRONT_DISTRIBUTION_ID;

    if (!distributionId) {
        console.log("No CLOUDFRONT_DISTRIBUTION_ID found in environment. Skipping.");
        return;
    }

    console.log(`Target Distribution: ${distributionId}`);
    
    try {
        console.log("Fetching current configuration...");
        const { Distribution, ETag } = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }));
        
        if (!Distribution || !Distribution.DistributionConfig) {
            throw new Error("Could not retrieve distribution configuration.");
        }

        if (Distribution.DistributionConfig.Enabled) {
            console.log("\x1b[33mDistribution is currently ENABLED. Disabling it now...\x1b[0m");
            
            const newConfig = {
                ...Distribution.DistributionConfig,
                Enabled: false
            };

            await cloudFrontClient.send(new UpdateDistributionCommand({
                Id: distributionId,
                IfMatch: ETag,
                DistributionConfig: newConfig
            }));

            console.log("\x1b[32mSUCCESS: Distribution disabling requested.\x1b[0m");
        } else {
            console.log("\x1b[32mDistribution is already DISABLED.\x1b[0m");
        }
        
        console.log("\n\x1b[33mNote: CloudFront requires ~15-20 minutes to propagate the status change to 'Deployed'.\x1b[0m");
        console.log("You cannot delete the distribution until this process completes.");
        
        console.log("\nFinal Manual Steps:");
        console.log("1. Go to AWS CloudFront Console.");
        console.log(`2. Find Distribution: ${distributionId}`);
        console.log("3. Wait until the status is 'Deployed' and the state is 'Disabled'.");
        console.log("5. Once disabled, select it again and click 'Delete'.");

        // Scrub keys from .env
        removeFromEnv(['CLOUDFRONT_DISTRIBUTION_ID', 'CLOUDFRONT_DOMAIN']);
    } catch (e: any) {
        console.error("\x1b[31mCloudFront Reset Error:\x1b[0m", e.message);
    }
}

run();
