import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { env } from "./src/config/env";

const cloudwatchClient = new CloudWatchLogsClient({ 
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: env.AWS_SESSION_TOKEN
    }
} as any);

async function listAllLogGroups() {
    try {
        console.log("Listing ALL log groups in", env.AWS_REGION, "...");
        const response = await cloudwatchClient.send(new DescribeLogGroupsCommand({}));
        
        console.log("Found log groups:");
        if (response.logGroups) {
            response.logGroups.forEach(group => {
                console.log(`- ${group.logGroupName}`);
            });
        } else {
            console.log("No log groups found.");
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

listAllLogGroups();
