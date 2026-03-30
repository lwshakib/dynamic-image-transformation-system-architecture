import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { env } from './config/env'
import { postgresService } from './services/postgres.service'
import { s3Service } from './services/s3.service'
import { transformationService } from './services/transformation.service'
import { SecurityUtils } from './utils/security'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import { asyncHandler } from './utils/asyncHandler'
import logger from './logger/winston.logger'
import morganMiddleware from './logger/morgan.logger'
import { errorHandler } from './middlewares/error.middlewares'
import { ApiError } from './utils/ApiError'

/**
 * Image Transformation Server (Express)
 * Acts as the primary API for image management and a transformation gateway.
 */
const app = express()
const port = env.PORT

// Standard S3 Client for local proxying / streaming
const s3Client = new S3Client({
  region: env.AWS_REGION,
  ...(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
} as any)

// 1. Enable CORS for local development and Dashboard communication
app.use(cors())
// 2. Standard JSON body parsing for image confirmation and metadata
app.use(express.json())
// 3. HTTP Request Logging
app.use(morganMiddleware)

// 3. Transformation Query Validation (w=width, h=height, f=format)
const TransformParamsSchema = z.object({
  w: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : undefined)),
  h: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v) : undefined)),
  f: z.string().optional(),
})

// 4. Pre-signed URL Post-Validation
const PresignedUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().startsWith('image/'),
  isSecure: z.boolean().default(false),
})

// --- Routes ---

/**
 * GET /cdn/:key(*)
 * Custom Image Proxy: Dynamically transforms images by path and query strings.
 * Implementation: Streams data directly so the browser URL stays as the "CDN" link.
 */
app.get(
  '/cdn/:key(*)',
  asyncHandler(async (req, res) => {
    // A. Capture the key directly from the wildcard path
    const { key } = req.params as any
    if (!key) throw new ApiError(400, 'Missing image key')

    // B. Parse transformation parameters from the URL query string
    const { w, h, f, q, e } = req.query as any

    // Security Check: If an expiry is present, validate it against server time
    if (e) {
      const currentTime = Math.floor(Date.now() / 1000)
      if (parseInt(e) < currentTime) {
        throw new ApiError(403, 'Forbidden: This link has expired.')
      }
    }

    // C. Use the transformation engine (Sharp + S3 Cache Layer)
    // Construct a cache key consistent with CloudFront rewrite patterns: /cdn/original-key/ops...
    const ops = []
    if (f && f !== 'none') ops.push(`format=${f}`)
    if (w) ops.push(`width=${w}`)
    if (h) ops.push(`height=${h}`)
    if (q) ops.push(`quality=${q}`)

    const opsString = ops.length > 0 ? ops.join(',') : 'original'
    const targetCacheKey = `cdn/${key}/${opsString}`

    const { buffer, contentType } = await transformationService.transformImage(key as string, targetCacheKey, {
      width: w as string | undefined,
      height: h as string | undefined,
      format: f as string | undefined,
      quality: q as string | undefined,
      signature: (req.query.s as string) || undefined,
      expires: e as string | undefined,
    })

    // D. Send the transformed buffer back directly
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(buffer)
  })
)

/**
 * GET /images
 * Dashboard Gallery API: Lists all available transformed assets.
 */
app.get(
  '/images',
  asyncHandler(async (req, res) => {
    const result = await postgresService.getAllImages()
    const distributionBase = env.CLOUDFRONT_DOMAIN
      ? `https://${env.CLOUDFRONT_DOMAIN}/cdn`
      : `http://localhost:${port}/cdn`

    const transformedList = result.rows.map((image) => {
      const row = {
        ...image,
        distributionBase,
      }

      // If image is secure, we MUST provide a platform signature
      if (image.secure) {
        const expires = (Math.floor(Date.now() / 1000) + 3600).toString() // 1-hour window
        const signature = SecurityUtils.generateSignature(image.key, { e: expires })
        ;(row as any).signature = signature
        ;(row as any).expires = expires
      }

      return row
    })
    res.json(transformedList)
  })
)

/**
 * POST /images/presigned-url
 * Secure Ingest Workflow: Generates a temporary S3 upload link for the frontend.
 */
app.post(
  '/images/presigned-url',
  asyncHandler(async (req, res) => {
    const { fileName, contentType, isSecure } = PresignedUrlSchema.parse(req.body)
    const result = await s3Service.getPresignedUrl(fileName, contentType, isSecure)
    res.json(result)
  })
)

/**
 * GET /images/:id/sign
 * On-Demand Signing: Generates a valid HMAC signature for a specific transformation.
 * Used by the frontend Transformation Dialog to preview secure assets.
 */
app.get(
  '/images/:id/sign',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const { w, h, f, q } = req.query as any

    const image = await postgresService.getImageById(id as string)
    if (!image) throw new ApiError(404, 'Asset not found')

    const expires = (Math.floor(Date.now() / 1000) + 3600).toString() // 1-hour window

    // Generate the signature using the same utility as the gallery
    const signature = SecurityUtils.generateSignature(image.key as string, { w, h, f, q, e: expires })

    const distributionBase = env.CLOUDFRONT_DOMAIN
      ? `https://${env.CLOUDFRONT_DOMAIN}/cdn`
      : `http://localhost:${port}/cdn`

    // Construct parameters string
    const ops = []
    if (f) ops.push(`f=${f}`)
    if (w) ops.push(`w=${w}`)
    if (h) ops.push(`h=${h}`)
    if (q) ops.push(`q=${q}`)
    const queryString = [...ops, `e=${expires}`, `s=${signature}`].join('&')

    res.json({
      signature,
      signedUrl: `${distributionBase}/${image.path}?${queryString}`,
    })
  })
)

/**
 * POST /images/confirm
 * Metadata Sync: Saves the final S3 key to the local PostgreSQL database after a successful upload.
 */
app.post(
  '/images/confirm',
  asyncHandler(async (req, res) => {
    const { key, name, type, size, path, secure } = req.body
    const result = await postgresService.addImage({ key, name, type, size, path, secure })
    res.json(result)
  })
)

/**
 * DELETE /images/:id
 * Resource Management: Deletes the asset from both the S3 storage and the database registry.
 */
app.delete(
  '/images/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const image = await postgresService.getImageById(id as string)
    if (!image) throw new ApiError(404, 'Asset not found in registry')

    // A. Wipe from physical storage (S3)
    await s3Service.deleteFile(image.key as string)
    // B. Wipe from database registry (Postgres)
    await postgresService.deleteImageById(id as string)

    res.json({ message: 'Resource permanently deleted' })
  })
)

// 5. Error Handling Middleware
app.use(errorHandler)

// 6. Final API Initialization
app.listen(port, () => {
  logger.info(`SERVER LIVE at http://localhost:${port}`)
})
