import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { env } from './config/env';
import { postgresService } from './services/postgres.service';
import { s3Service } from './services/s3.service';
import { transformationService } from './services/transformation.service';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

/**
 * Image Transformation Server (Express)
 * Acts as the primary API for image management and a transformation gateway.
 */
const app = express();
const port = env.PORT;

// Standard S3 Client for local proxying / streaming
const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

// 1. Enable CORS for local development and Dashboard communication
app.use(cors());
// 2. Standard JSON body parsing for image confirmation and metadata
app.use(express.json());

// 3. Transformation Query Validation (w=width, h=height, f=format)
const TransformParamsSchema = z.object({
  w: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  h: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  f: z.string().optional(),
});

// 4. Pre-signed URL Post-Validation
const PresignedUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().startsWith('image/'),
});

// --- Routes ---

/**
 * GET /cdn/:key(*)
 * Custom Image Proxy: Dynamically transforms images by path and query strings.
 * Implementation: Streams data directly so the browser URL stays as the "CDN" link.
 */
app.get('/cdn/:key(*)', async (req, res) => {
    try {
        // A. Capture the key directly from the wildcard path
        const { key } = req.params as any;
        if (!key) return res.status(400).json({ error: 'Missing image key' });

        // B. Parse transformation parameters from the URL query string
        const { w, h, f } = TransformParamsSchema.parse(req.query);

        // C. Use the transformation engine (Sharp + S3 Cache Layer)
        const cacheKey = await transformationService.transformImage({ key, w, h, f });
        
        // D. Fetch the final transformed buffer from the S3 cache
        const command = new GetObjectCommand({
            Bucket: env.AWS_BUCKET_NAME_TRANSFORMED,
            Key: cacheKey,
        });
        const response = await s3Client.send(command);

        // E. Stream the raw image data back to the user with standard cache headers
        if (response.Body) {
            res.setHeader('Content-Type', response.ContentType || 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            (response.Body as Readable).pipe(res);
        } else {
            res.status(404).json({ error: 'Failed to access transformed image body' });
        }
    } catch (error) {
        if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
        console.error('CDN Proxy fatal error:', error);
        res.status(500).json({ error: 'Internal edge processing error' });
    }
});

/**
 * GET /images
 * Dashboard Gallery API: Lists all available transformed assets.
 */
app.get('/images', async (req, res) => {
    try {
        const result = await postgresService.getAllImages();
        
        // Determine the base distribution URL: Production CloudFront or Local Proxy
        const distributionBase = env.CLOUDFRONT_DOMAIN 
            ? `https://${env.CLOUDFRONT_DOMAIN}/cdn`
            : `http://localhost:${port}/cdn`;

        const transformedList = result.rows.map((image) => ({
            ...image,
            url: `${distributionBase}/${image.key}`,
        }));
        res.json(transformedList);
    } catch (error) {
        console.error('Database retrieval error:', error);
        res.status(500).json({ error: 'Failed to synchronize gallery' });
    }
});

/**
 * POST /images/presigned-url
 * Secure Ingest Workflow: Generates a temporary S3 upload link for the frontend.
 */
app.post('/images/presigned-url', async (req, res) => {
  try {
    const { fileName, contentType } = PresignedUrlSchema.parse(req.body);
    const result = await s3Service.getPresignedUrl(fileName, contentType);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.issues });
    console.error('Failed to generate pre-signed link:', error);
    res.status(500).json({ error: 'Ingest logic error' });
  }
});

/**
 * POST /images/confirm
 * Metadata Sync: Saves the final S3 key to the local PostgreSQL database after a successful upload.
 */
app.post('/images/confirm', async (req, res) => {
    try {
        const { key, name, type, size, url } = req.body;
        const result = await postgresService.addImage({ key, name, type, size, url });
        res.json(result);
    } catch (error) {
        console.error('DB metadata sync error:', error);
        res.status(500).json({ error: 'Failed to synchronize asset metadata' });
    }
});

/**
 * DELETE /images/:id
 * Resource Management: Deletes the asset from both the S3 storage and the database registry.
 */
app.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await postgresService.getImageById(id);
    if (!image) return res.status(404).json({ error: 'Asset not found in registry' });

    // A. Wipe from physical storage (S3)
    await s3Service.deleteFile(image.key);
    // B. Wipe from database registry (Postgres)
    await postgresService.deleteImageById(id);
    
    res.json({ message: 'Resource permanently deleted' });
  } catch (error) {
    console.error('Deletion operation error:', error);
    res.status(500).json({ error: 'Failed to decommission resource' });
  }
});

// 5. Final API Initialization
app.listen(port, () => {
  console.log(`\x1b[32m\x1b[1mSERVER LIVE\x1b[0m at http://localhost:${port}`);
});
