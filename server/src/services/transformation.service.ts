import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import sharp from 'sharp';
import { env } from '../config/env';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const transformationService = {
  /**
   * Transforms an image based on width, height, and format.
   * Caches the result in the transformed bucket.
   */
  async transformImage(params: { key: string; w?: number; h?: number; f?: string }) {
    const { key, w, h, f } = params;
    const format = (f || 'webp') as keyof sharp.FormatEnum;
    
    // Generate a unique cache key for this transformation
    const cacheKey = `transformed/${key.replace('uploads/', '')}-w${w || 'auto'}-h${h || 'auto'}-f${format}`;

    // 1. Check if the transformed image already exists in the transformed bucket
    try {
      await s3Client.send(new GetObjectCommand({
        Bucket: env.AWS_BUCKET_NAME_TRANSFORMED,
        Key: cacheKey,
      }));
      
      // If no error, it exists. return the public URL (or pre-signed)
      console.log(`Cache hit for ${cacheKey}`);
      return cacheKey;
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') {
          throw error;
      }
      // Cache miss, proceed to transformation
      console.log(`Cache miss for ${cacheKey}, starting transformation...`);
    }

    // 2. Fetch the original image from the uploads bucket
    const original = await s3Client.send(new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: key,
    }));

    if (!original.Body) {
        throw new Error("Failed to fetch original image body.");
    }

    // Convert S3 ReadableStream to Buffer for Sharp
    const chunks: Uint8Array[] = [];
    for await (const chunk of original.Body as Readable) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // 3. Process with Sharp
    let sharpInstance = sharp(buffer);
    
    if (w || h) {
      sharpInstance = sharpInstance.resize({
        width: w,
        height: h,
        fit: 'cover',
      });
    }

    // Convert format
    const transformedBuffer = await sharpInstance.toFormat(format).toBuffer();

    // 4. Save the transformed image to the transformed bucket
    await s3Client.send(new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_TRANSFORMED,
      Key: cacheKey,
      Body: transformedBuffer,
      ContentType: `image/${format}`,
    }));

    console.log(`Successfully transformed and cached: ${cacheKey}`);
    return cacheKey;
  }
};
