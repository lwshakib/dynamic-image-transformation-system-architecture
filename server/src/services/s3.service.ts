import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as s3GetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const s3Service = {
  async getPresignedUrl(fileName: string, contentType: string) {
    const key = `uploads/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await s3GetSignedUrl(s3Client, command, { expiresIn: 3600 });
    const publicUrl = `https://${env.AWS_BUCKET_NAME_IMAGES}.s3.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl, key };
  },

  async getDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    });
    // Generate a pre-signed URL that expires in 1 hour (3600 seconds)
    return await s3GetSignedUrl(s3Client, command, { expiresIn: 3600 });
  },

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    });
    return await s3Client.send(command);
  },

  async createBucket(bucketName: string) {
    try {
      console.log(`Checking if bucket "${bucketName}" exists...`);
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      console.log(`Bucket "${bucketName}" already exists.`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        console.log(`Creating bucket "${bucketName}"...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
        console.log(`Bucket "${bucketName}" created successfully.`);
      } else {
        console.error(`Error checking/creating bucket "${bucketName}":`, error.message);
        throw error;
      }
    }
  },

  async setupCors(bucketName: string) {
    console.log(`Configuring CORS for bucket "${bucketName}"...`);
    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    });
    await s3Client.send(command);
    console.log(`CORS configured successfully for "${bucketName}".`);
  },
};
