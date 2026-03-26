import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { env } from './config/env';
import { postgresService } from './services/postgres.service';
import { s3Service } from './services/s3.service';
import { transformationService } from './services/transformation.service';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const app = express();
const port = env.PORT;

const s3Client = new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Validation Schemas
const PresignedUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().startsWith('image/'),
});

const TransformParamsSchema = z.object({
  w: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  h: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  f: z.string().optional(),
});

// Routes
app.get('/health', async (req, res) => {
    try {
        await postgresService.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'error', database: 'disconnected' });
    }
});

/**
 * GET /cdn/*
 * Streamed transformation gateway. 
 * By streaming (instead of redirecting), the browser URL stays as the CDN URL, 
 * allowing you to manually add and test queries like ?w=100 in the address bar.
 */
app.get('/cdn/:key(*)', async (req, res) => {
    try {
        const { key } = req.params as any;
        if (!key) {
            return res.status(400).json({ error: 'Missing image key' });
        }

        const { w, h, f } = TransformParamsSchema.parse(req.query);
        const cacheKey = await transformationService.transformImage({ key, w, h, f });
        
        // 1. Fetch the cached/transformed image from the transformed bucket
        const command = new GetObjectCommand({
            Bucket: env.AWS_BUCKET_NAME_TRANSFORMED,
            Key: cacheKey,
        });
        const response = await s3Client.send(command);

        // 2. Stream the image back to the client
        if (response.Body) {
            res.setHeader('Content-Type', response.ContentType || 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            (response.Body as Readable).pipe(res);
        } else {
            res.status(404).json({ error: 'Transformed image not found' });
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('CDN Proxy error:', error);
        res.status(500).json({ error: 'Failed to stream/transform image' });
    }
});

// GET /images - List all base images
app.get('/images', async (req, res) => {
    try {
        const result = await postgresService.getAllImages();
        const imagesWithSignedUrls = result.rows.map((image) => ({
            ...image,
            // Point to our local CDN proxy
            url: `http://localhost:${port}/cdn/${image.key}`,
        }));
        res.json(imagesWithSignedUrls);
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

// POST /images/presigned-url - Generate URL for direct upload to S3
app.post('/images/presigned-url', async (req, res) => {
  try {
    const { fileName, contentType } = PresignedUrlSchema.parse(req.body);
    const result = await s3Service.getPresignedUrl(fileName, contentType);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
    }
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate pre-signed URL' });
  }
});

// POST /images/confirm - Save image metadata to DB
app.post('/images/confirm', async (req, res) => {
    try {
        const { key, name, type, size, url } = req.body;
        const result = await postgresService.addImage({ key, name, type, size, url });
        res.json(result);
    } catch (error) {
        console.error('Error confirming image:', error);
        res.status(500).json({ error: 'Failed to confirm image saved to DB' });
    }
});

// DELETE /images/:id - Delete from S3 and DB
app.delete('/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const image = await postgresService.getImageById(id);
    if (!image) {
        return res.status(404).json({ error: 'Image not found' });
    }
    await s3Service.deleteFile(image.key);
    await postgresService.deleteImageById(id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
