import logger from '../../logger/winston.logger'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { env } from '../../envs'

import { getAwsConfig } from './env-utils'

const s3Client = new S3Client(getAwsConfig())

async function listBucket() {
  try {
    logger.info(`Listing bucket: ${env.AWS_BUCKET_NAME_IMAGES}`)
    const res = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: env.AWS_BUCKET_NAME_IMAGES,
        Prefix: 'uploads/',
      })
    )
    logger.info('Objects found:')
    res.Contents?.forEach((obj) => logger.info(` - ${obj.Key} (${obj.Size} bytes)`))
  } catch (e: any) {
    logger.error('Error:', e.message)
  }
}

listBucket()

