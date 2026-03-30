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
 * Amazon S3 Service
 * Handles all direct interactions with AWS S3 buckets.
 */
const s3Client = new S3Client(getAwsConfig())

export const s3Service = {
  /**
   * Generates a pre-signed URL for client-side uploads.
   * This allows the browser to upload directly to S3 without passing through our server.
   */
  async getPresignedUrl(fileName: string, contentType: string, isSecure: boolean = false) {
    const prefix = isSecure ? 'secure' : 'public'
    const key = `${prefix}/uploads/${Date.now()}-${fileName}`

    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
      ContentType: contentType,
    })

    // Sign the URL for a 1-hour window (3600 seconds)
    const uploadUrl = await s3GetSignedUrl(s3Client, command, { expiresIn: 3600 })
    // Construct a standard public URL (may be restricted by bucket policy)
    const publicUrl = `https://${env.AWS_BUCKET_NAME_IMAGES}.s3.amazonaws.com/${key}`

    return { uploadUrl, publicUrl, key }
  },

  /**
   * Generates a pre-signed URL for downloading or viewing an image.
   * works for both raw and transformed assets based on the isTransformed flag.
   */
  async getDownloadUrl(key: string, isTransformed: boolean = false) {
    const command = new GetObjectCommand({
      Bucket: isTransformed ? env.AWS_BUCKET_NAME_TRANSFORMED : env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    })
    // Generate a pre-signed URL that expires in 1 hour
    return await s3GetSignedUrl(s3Client, command, { expiresIn: 3600 })
  },

  /**
   * Deletes a specific file from the main uploads bucket.
   */
  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    })
    return await s3Client.send(command)
  },

  /**
   * Checks if a bucket exists, if not, creates it.
   */
  async createBucket(bucketName: string) {
    try {
      logger.info(`Checking if bucket "${bucketName}" exists...`)
      // HeadBucket throws 404 if it doesn't exist
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }))
      logger.info(`Bucket "${bucketName}" already exists.`)
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        logger.info(`Creating bucket "${bucketName}"...`)
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }))
        logger.info(`Bucket "${bucketName}" created successfully.`)
      } else {
        logger.error(`Error checking/creating bucket "${bucketName}": ${error.message}`)
        throw error
      }
    }
  },

  /**
   * Configures CORS (Cross-Origin Resource Sharing) for an S3 bucket.
   * Essential for browser-to-S3 uploads.
   */
  async setupCors(bucketName: string) {
    logger.info(`Configuring CORS for bucket "${bucketName}"...`)
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*', 'x-amz-meta-secure'],
            // Methods needed for upload (PUT) and view (GET/HEAD)
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            // Replace '*' with specific host in production
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-meta-secure'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
    await s3Client.send(command)
    logger.info(`CORS configured successfully for "${bucketName}".`)
  },
}
