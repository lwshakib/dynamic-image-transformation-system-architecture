import { CloudWatchLogsClient, GetLogEventsCommand, DescribeLogStreamsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { env } from "../src/config/env";

const client = new CloudWatchLogsClient({ 
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? {
        credentials: {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN || undefined
        }
    } : {})
} as any);

async function dumpRecentLogs() {
    const logGroupName = "/aws/lambda/image-transformation-engine";
    const streams = await client.send(new DescribeLogStreamsCommand({
        logGroupName,
        orderBy: "LastEventTime",
        descending: true,
        limit: 1
    }));
    
    if (streams.logStreams && streams.logStreams.length > 0) {
        const events = await client.send(new GetLogEventsCommand({
            logGroupName,
            logStreamName: streams.logStreams[0].logStreamName!,
            limit: 50
        }));
        
        events.events?.reverse().forEach(e => {
            console.log(`[${new Date(e.timestamp!).toISOString()}] ${e.message}`);
        });
    }
}

dumpRecentLogs();
