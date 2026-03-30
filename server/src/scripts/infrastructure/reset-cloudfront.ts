import logger from '../../logger/winston.logger'
import { CloudFrontClient, GetDistributionCommand, UpdateDistributionCommand } from '@aws-sdk/client-cloudfront'
import { env } from '../../envs'
import { removeFromEnv } from '../utils/env-utils'

const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION })

async function run() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  logger.info('\n\x1b[31m\x1b[1m=== CloudFront Decommissioner ===\x1b[0m')
  const distributionId = env.CLOUDFRONT_DISTRIBUTION_ID

  if (!distributionId) {
    logger.info('No CLOUDFRONT_DISTRIBUTION_ID found in environment. Skipping.')
    return
  }

  logger.info(`Target Distribution: ${distributionId}`)

  try {
    logger.info('Fetching current configuration...')
    const { Distribution, ETag } = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }))

    if (!Distribution || !Distribution.DistributionConfig) {
      throw new Error('Could not retrieve distribution configuration.')
    }

    if (Distribution.DistributionConfig.Enabled) {
      logger.info('\x1b[33mDistribution is currently ENABLED. Disabling it now...\x1b[0m')

      const newConfig = {
        ...Distribution.DistributionConfig,
        Enabled: false,
      }

      await cloudFrontClient.send(
        new UpdateDistributionCommand({
          Id: distributionId,
          IfMatch: ETag,
          DistributionConfig: newConfig,
        })
      )

      logger.info('\x1b[32mSUCCESS: Distribution disabling requested.\x1b[0m')
    } else {
      logger.info('\x1b[32mDistribution is already DISABLED.\x1b[0m')
    }

    logger.info(
      "\n\x1b[33mNote: CloudFront requires ~15-20 minutes to propagate the status change to 'Deployed'.\x1b[0m"
    )
    logger.info('You cannot delete the distribution until this process completes.')

    logger.info('\nFinal Manual Steps:')
    logger.info('1. Go to AWS CloudFront Console.')
    logger.info(`2. Find Distribution: ${distributionId}`)
    logger.info("3. Wait until the status is 'Deployed' and the state is 'Disabled'.")
    logger.info("5. Once disabled, select it again and click 'Delete'.")

    // Scrub keys from .env
    removeFromEnv(['CLOUDFRONT_DISTRIBUTION_ID', 'CLOUDFRONT_DOMAIN'])
  } catch (e: any) {
    logger.error('\x1b[31mCloudFront Reset Error:\x1b[0m', e.message)
  }
}

run()

