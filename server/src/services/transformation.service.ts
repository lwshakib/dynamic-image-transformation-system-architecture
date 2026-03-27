import sharp from "sharp";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env";
import { Readable } from "stream";

/**
 * Image Transformation Engine
 * Uses Sharp to perform high-performance image processing.
 * Manages an S3-based caching layer for processed assets.
 */
const s3Client = new S3Client({
    region: env.AWS_REGION,
    ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY ? {
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN || undefined,
      }
    } : {})
} as any);

export const transformationService = {
  /**
   * Transforms an image by original key and a target cache key.
   * Logic: Download -> Process -> Upload cache -> Return Buffer & Content Type.
   */
  async transformImage(originalKey: string, targetCacheKey: string, ops: any) {
    const { width, height, format: fmt, quality: qual } = ops;
    
    // Default format if not provided
    const format = fmt || 'webp';
    
    // 1. Download the original source image from the uploads bucket
    const getCommand = new GetObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_IMAGES,
      Key: originalKey,
    });
    
    const { Body, ContentType: originalContentType } = await s3Client.send(getCommand);
    if (!Body) throw new Error("Could not fetch source image from S3.");

    // Convert S3 Body (Readable stream) to Buffer for Sharp
    const buffer = await this.streamToBuffer(Body as Readable);

    // If "original" is requested, just return the buffer
    if (ops.original) {
      return { buffer, contentType: originalContentType || 'image/jpeg' };
    }

    // 2. Perform the Image Transformation using Sharp
    let transformer = sharp(buffer);

    // Conditional Resize
    const w = width ? parseInt(width as string) : undefined;
    const h = height ? parseInt(height as string) : undefined;
    if (w || h) {
      transformer = transformer.resize(w, h, {
        fit: 'cover',
        withoutEnlargement: true
      });
    }

    // Quality
    const q = qual ? parseInt(qual as string) : 80;

    // Formatting
    let contentType = 'image/jpeg';
    switch (format) {
      case 'webp': 
        transformer = transformer.webp({ quality: q }); 
        contentType = 'image/webp';
        break;
      case 'jpeg':
      case 'jpg': 
        transformer = transformer.jpeg({ quality: q }); 
        contentType = 'image/jpeg';
        break;
      case 'png': 
        transformer = transformer.png(); 
        contentType = 'image/png';
        break;
      case 'avif': 
        transformer = transformer.avif({ quality: q }); 
        contentType = 'image/avif';
        break;
      default: 
        transformer = transformer.webp({ quality: q }); 
        contentType = 'image/webp';
    }

    // Generate output Buffer
    const resultBuffer = await transformer.toBuffer();

    // 3. Save the newly transformed image to the cache (transformed bucket)
    // The key should match EXACTLY what CloudFront would request from S3
    const putCommand = new PutObjectCommand({
      Bucket: env.AWS_BUCKET_NAME_TRANSFORMED,
      Key: targetCacheKey,
      Body: resultBuffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache for variants
    });
    await s3Client.send(putCommand);

    console.log(`Successfully transformed and cached at: ${targetCacheKey}`);
    return { buffer: resultBuffer, contentType };
  },

  /**
   * Helper utility to convert a Node.js Readable stream to a Buffer.
   * Necessary because Sharp works most efficiently with fully buffered data.
   */
  async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", (err) => reject(err));
    });
  }
};
