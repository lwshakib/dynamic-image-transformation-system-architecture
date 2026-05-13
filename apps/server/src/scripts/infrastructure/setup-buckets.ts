import logger from '../../logger/winston.logger'
import { s3Service } from '../../services/s3.services'
import { env } from '../../envs'

/**
 * S3 Infrastructure Orchestrator
 * Automates the creation and configuration of S3 buckets.
 */
async function setup() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  logger.info('\x1b[35m=== S3 Cloud Infrastructure Initializer ===\x1b[0m')

  try {
    // 1. Core Uploads Bucket (Source images)
    await s3Service.createBucket(env.AWS_BUCKET_NAME_IMAGES)
    await s3Service.setupCors(env.AWS_BUCKET_NAME_IMAGES)

    // 2. Transformed Cache Bucket (Processed assets)
    await s3Service.createBucket(env.AWS_BUCKET_NAME_TRANSFORMED)
    await s3Service.setupCors(env.AWS_BUCKET_NAME_TRANSFORMED)

    logger.info('\n\x1b[32m\x1b[1mSUCCESS: All S3 resources provisioned!\x1b[0m')
  } catch (e: any) {
    logger.error(`\n\x1b[31mFATAL: S3 Setup failed:\x1b[0m\n${e.message}`)
    process.exit(1)
  }
}

setup()

