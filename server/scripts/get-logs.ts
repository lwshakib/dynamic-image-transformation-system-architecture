import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { env } from "../src/config/env";

const cloudwatchClient = new CloudWatchLogsClient({ 
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? {
        credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
        }
    } : {})
} as any);
const logGroupName = "/aws/lambda/image-transformation-engine";

async function getLogs() {
    try {
        console.log("Fetching latest log stream for:", logGroupName);
        const streams = await cloudwatchClient.send(new DescribeLogStreamsCommand({
            logGroupName: logGroupName,
            orderBy: "LastEventTime",
            descending: true,
            limit: 1
        }));
        
        if (!streams.logStreams || streams.logStreams.length === 0) {
            console.log("No logs found yet.");
            return;
        }
        
        const streamName = streams.logStreams[0].logStreamName;
        console.log("Log Stream:", streamName);
        
        const events = await cloudwatchClient.send(new GetLogEventsCommand({
            logGroupName: logGroupName,
            logStreamName: streamName,
            limit: 50
        }));
        
        events.events?.forEach(event => {
            console.log(`[${new Date(event.timestamp!).toISOString()}] ${event.message}`);
        });
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

getLogs();
