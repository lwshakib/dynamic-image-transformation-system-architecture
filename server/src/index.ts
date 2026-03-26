import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { env } from './config/env';
import { postgresService } from './services/postgres.service';
import { s3Service } from './services/s3.service';
import { transformationService } from './services/transformation.service';

const app = express();
const port = env.PORT;

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
 * High-performance transformation gateway (Simulating Lambda@Edge or Origin Request)
 * Example: /cdn/uploads/logo.png?w=200&h=200&f=webp
 */
app.get('/cdn/:key(*)', async (req, res) => {
    try {
        const { key } = req.params as any;
        if (!key) {
            return res.status(400).json({ error: 'Missing image key' });
        }

        const { w, h, f } = TransformParamsSchema.parse(req.query);
        const cacheKey = await transformationService.transformImage({ key, w, h, f });
        
        // Generate a pre-signed URL for the cached asset
        const url = await s3Service.getDownloadUrl(cacheKey, true);
        
        // Redirect to the S3 URL (similar to Lambda@Edge or Origin Response)
        res.redirect(302, url);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('CDN Proxy error:', error);
        res.status(500).json({ error: 'Failed to transform image' });
    }
});

// GET /images - List all base images
app.get('/images', async (req, res) => {
    try {
        const result = await postgresService.getAllImages();
        const imagesWithSignedUrls = await Promise.all(
          result.rows.map(async (image) => ({
            ...image,
            // Provide the dynamic transformation URL as the primary access point
            url: `${process.env.API_URL || env.DATABASE_URL ? 'http://localhost:' + port : ''}/cdn/${image.key}`,
          }))
        );
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
