import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { env } from './config/env';
import { postgresService } from './services/postgres.service';
import { s3Service } from './services/s3.service';

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

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// GET /images - List all images from DB
app.get('/images', async (req, res) => {
    try {
        const result = await postgresService.getAllImages();
        res.json(result.rows);
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

// POST /images/confirm - Call this after successful S3 upload
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
    
    // 1. Get image info from DB
    const image = await postgresService.getImageById(id);
    if (!image) {
        return res.status(404).json({ error: 'Image not found' });
    }
    
    // 2. Delete from S3
    await s3Service.deleteFile(image.key);

    // 3. Delete from DB
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
