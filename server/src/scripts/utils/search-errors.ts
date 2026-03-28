import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { env } from '../../src/config/env'

const cloudwatchClient = new CloudWatchLogsClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    sessionToken: env.AWS_SESSION_TOKEN,
  },
} as any)
const logGroupName = '/aws/lambda/image-transformation-engine'

async function searchErrors() {
  try {
    console.log('Fetching recent log streams...')
    const streams = await cloudwatchClient.send(
      new DescribeLogStreamsCommand({
        logGroupName: logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 5,
      })
    )

    for (const stream of streams.logStreams || []) {
      console.log('\n--- Checking Stream:', stream.logStreamName, '---')
      const events = await cloudwatchClient.send(
        new GetLogEventsCommand({
          logGroupName: logGroupName,
          logStreamName: stream.logStreamName!,
          limit: 100,
        })
      )

      events.events?.forEach((event) => {
        const msg = event.message || ''
        if (msg.includes('Incoming Event') || msg.includes('Error') || msg.includes('Forbidden')) {
          console.log(`[${new Date(event.timestamp!).toISOString()}] ${msg}`)
        }
      })
    }
  } catch (e: any) {
    console.error('Error:', e.message)
  }
}

searchErrors()
