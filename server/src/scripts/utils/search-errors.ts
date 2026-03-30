import logger from '../../logger/winston.logger'
import { CloudWatchLogsClient, DescribeLogStreamsCommand, GetLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'
import { env } from '../../envs'

import { getAwsConfig } from './env-utils'

const cloudwatchClient = new CloudWatchLogsClient(getAwsConfig())
const logGroupName = '/aws/lambda/image-transformation-engine'

async function searchErrors() {
  try {
    logger.info('Fetching recent log streams...')
    const streams = await cloudwatchClient.send(
      new DescribeLogStreamsCommand({
        logGroupName: logGroupName,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 5,
      })
    )

    for (const stream of streams.logStreams || []) {
      logger.info('\n--- Checking Stream:', stream.logStreamName, '---')
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
          logger.info(`[${new Date(event.timestamp!).toISOString()}] ${msg}`)
        }
      })
    }
  } catch (e: any) {
    logger.error('Error:', e.message)
  }
}

searchErrors()

