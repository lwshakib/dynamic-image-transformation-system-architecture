import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { env } from '../../config/env'

const s3Client = new S3Client({ region: env.AWS_REGION })

async function emptyAndDeleteBucket(bucketName: string) {
  if (!bucketName) return
  try {
    console.log(`Cleaning S3 storage: Bucket "${bucketName}"...`)
    const listResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }))
    if (listResult.Contents?.length) {
      const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })) },
      }
      await s3Client.send(new DeleteObjectsCommand(deleteParams))
    }
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }))
    console.log(`Bucket "${bucketName}" decommissioned.`)
  } catch (e: any) {
    console.warn(`Bucket Error (${bucketName}):`, e.message)
  }
}

async function run() {
  console.log('\n\x1b[31m\x1b[1m=== S3 Bucket Decommissioner ===\x1b[0m')
  await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_IMAGES)
  await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_TRANSFORMED)
  console.log('\x1b[32m\x1b[1mSUCCESS: Buckets wiped clean!\x1b[0m')
}

run()

