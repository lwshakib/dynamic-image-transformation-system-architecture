import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../envs'
import { getAwsConfig } from '../scripts/utils/env-utils'
import logger from '../logger/winston.logger'

/**
 * Amazon S3 Services
 * Handles all direct interactions with AWS S3 buckets.
 */
class S3Services {
  private client: S3Client

  constructor() {
    this.client = new S3Client(getAwsConfig())
  }

  /**
   * Generates a pre-signed URL for client-side uploads.
   */
  async getPresignedUrl(fileName: string, contentType: string, isSecure: boolean = false) {
    const prefix = isSecure ? 'secure' : 'public'
    const key = `${prefix}/uploads/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
      ContentType: contentType,
    })

    const uploadUrl = await s3GetSignedUrl(this.client, command, { expiresIn: 3600 })
    const publicUrl = `https://${env.AWS_BUCKET_NAME_IMAGES}.s3.amazonaws.com/${key}`

    return { uploadUrl, publicUrl, key }
  }

  /**
   * Generates a pre-signed URL for downloading or viewing an image.
   */
  async getDownloadUrl(key: string, isTransformed: boolean = false) {
    const command = new GetObjectCommand({
      Bucket: isTransformed ? env.AWS_BUCKET_NAME_TRANSFORMED : env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    })
    return await s3GetSignedUrl(this.client, command, { expiresIn: 3600 })
  }

  /**
   * Deletes a specific file from the main uploads bucket.
   */
  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    })
    return await this.client.send(command)
  }

  /**
   * Checks if a bucket exists, if not, creates it.
   */
  async createBucket(bucketName: string) {
    try {
      logger.info(`Checking if bucket "${bucketName}" exists...`)
      await this.client.send(new HeadBucketCommand({ Bucket: bucketName }))
      logger.info(`Bucket "${bucketName}" already exists.`)
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        logger.info(`Creating bucket "${bucketName}"...`)
        await this.client.send(new CreateBucketCommand({ Bucket: bucketName }))
        logger.info(`Bucket "${bucketName}" created successfully.`)
      } else {
        logger.error(`Error checking/creating bucket "${bucketName}": ${error.message}`)
        throw error
      }
    }
  }

  /**
   * Configures CORS (Cross-Origin Resource Sharing) for an S3 bucket.
   */
  async setupCors(bucketName: string) {
    logger.info(`Configuring CORS for bucket "${bucketName}"...`)
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*', 'x-amz-meta-secure'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-meta-secure'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
    await this.client.send(command)
    logger.info(`CORS configured successfully for "${bucketName}".`)
  }
}

export const s3Service = new S3Services()
