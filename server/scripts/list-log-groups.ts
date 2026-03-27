import { CloudWatchLogsClient, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { env } from "../src/config/env";

const cloudwatchClient = new CloudWatchLogsClient({ 
    region: env.AWS_REGION,
    credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY
    }
});

async function listLogGroups() {
    try {
        console.log("Listing log groups...");
        const response = await cloudwatchClient.send(new DescribeLogGroupsCommand({
            LogGroupNamePrefix: "/aws/lambda/"
        }));
        
        console.log("Found log groups:");
        response.LogGroups?.forEach(group => {
            console.log(`- ${group.logGroupName}`);
        });
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

listLogGroups();
