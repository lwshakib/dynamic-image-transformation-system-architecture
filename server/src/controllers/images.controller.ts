import { Request, Response } from 'express'
import { z } from 'zod'
import { env } from '../envs'
import { postgresService } from '../services/postgres.service'
import { s3Service } from '../services/s3.service'
import { transformationService } from '../services/transformation.service'
import { SecurityUtils } from '../utils/security'
import { ApiError } from '../utils/ApiError'
import { asyncHandler } from '../utils/asyncHandler'

/**
 * Image Controller
 * Handles image transformations, uploads, metadata management, and signatures.
 */

// 1. Transformation Query Validation (w=width, h=height, f=format)
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

// 2. Pre-signed URL Post-Validation
const PresignedUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().startsWith('image/'),
  isSecure: z.boolean().default(false),
})

const imagesController = {
  /**
   * Custom Image Proxy: Dynamically transforms images by path and query strings.
   */
  cdnProxy: asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params
    if (!key) throw new ApiError(400, 'Missing image key')

    const { w, h, f, q, e } = req.query as any

    // Security Check: If an expiry is present, validate it against server time
    if (e) {
      const currentTime = Math.floor(Date.now() / 1000)
      if (parseInt(e) < currentTime) {
        throw new ApiError(403, 'Forbidden: This link has expired.')
      }
    }

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

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(buffer)
  }),

  /**
   * Dashboard Gallery API: Lists all available transformed assets.
   */
  getAllImages: asyncHandler(async (_req: Request, res: Response) => {
    const result = await postgresService.getAllImages()
    const port = env.PORT

    const distributionBase = env.CLOUDFRONT_DOMAIN
      ? `https://${env.CLOUDFRONT_DOMAIN}/cdn`
      : `http://localhost:${port}/cdn`

    const transformedList = result.rows.map((image) => {
      const row = {
        ...image,
        distributionBase,
      }

      if (image.secure) {
        const expires = (Math.floor(Date.now() / 1000) + 3600).toString()
        const signature = SecurityUtils.generateSignature(image.key, { e: expires })
        ;(row as any).signature = signature
        ;(row as any).expires = expires
      }

      return row
    })
    res.json(transformedList)
  }),

  /**
   * Secure Ingest Workflow: Generates a temporary S3 upload link for the frontend.
   */
  getPresignedUrl: asyncHandler(async (req: Request, res: Response) => {
    const { fileName, contentType, isSecure } = PresignedUrlSchema.parse(req.body)
    const result = await s3Service.getPresignedUrl(fileName, contentType, isSecure)
    res.json(result)
  }),

  /**
   * On-Demand Signing: Generates valid HMAC signatures for specific transformations.
   */
  signImage: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const { w, h, f, q } = req.query as any

    const image = await postgresService.getImageById(id as string)
    if (!image) throw new ApiError(404, 'Asset not found')

    const expires = (Math.floor(Date.now() / 1000) + 3600).toString()
    const signature = SecurityUtils.generateSignature(image.key as string, { w, h, f, q, e: expires })

    const port = env.PORT
    const distributionBase = env.CLOUDFRONT_DOMAIN
      ? `https://${env.CLOUDFRONT_DOMAIN}/cdn`
      : `http://localhost:${port}/cdn`

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
  }),

  /**
   * Metadata Sync: Saves final S3 keys to Postgres after successful upload.
   */
  confirmImage: asyncHandler(async (req: Request, res: Response) => {
    const { key, name, type, size, path, secure } = req.body
    const result = await postgresService.addImage({ key, name, type, size, path, secure })
    res.json(result)
  }),

  /**
   * Resource Management: Decommissions assets from S3 and Postgres.
   */
  deleteImage: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params
    const image = await postgresService.getImageById(id as string)
    if (!image) throw new ApiError(404, 'Asset not found in registry')

    await s3Service.deleteFile(image.key as string)
    await postgresService.deleteImageById(id as string)

    res.json({ message: 'Resource permanently deleted' })
  }),
}

export { imagesController }
