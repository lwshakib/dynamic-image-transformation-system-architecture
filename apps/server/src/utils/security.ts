import crypto from 'crypto'
import { env } from '../envs'

/**
 * SecurityUtils: HMAC-based Cryptographic Signing
 * Ensures that image transformation requests are authorized by the platform.
 */
export class SecurityUtils {
  private static readonly SECRET = env.SIGNING_SECRET

  /**
   * Generates a signature for a given image path and parameters.
   * Mimics the normalization logic of the CloudFront Function.
   */
  static generateSignature(
    imagePath: string,
    params: { w?: string; h?: string; f?: string; q?: string; e?: string } = {}
  ): string {
    const normalizedPath = this.getNormalizedPath(imagePath, params)

    return crypto.createHmac('sha256', this.SECRET).update(normalizedPath).digest('hex').substring(0, 16) // Short signature for cleaner URLs
  }

  /**
   * Validates an incoming request path against its signature.
   */
  static validateSignature(targetPathBase: string, signature: string, expiry?: string): boolean {
    if (!signature || !targetPathBase) return false

    // Construct the full string used for signing (path + expiry if present)
    const signableString = expiry ? `${targetPathBase}?e=${expiry}` : targetPathBase

    const expected = crypto.createHmac('sha256', this.SECRET).update(signableString).digest('hex').substring(0, 16)

    // Security: Use timingSafeEqual to prevent timing attacks
    // REQUIREMENT: Buffers MUST have identical length
    const sigBuffer = Buffer.from(signature)
    const expBuffer = Buffer.from(expected)

    if (sigBuffer.length !== expBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(sigBuffer, expBuffer)
  }

  /**
   * Internal: Replicate the CloudFront Function's path normalization.
   * Result format: cdn/original-key/format=webp,width=100
   * If an expiry is provided, it's appended as a query param in the signable string.
   */
  private static getNormalizedPath(
    key: string,
    params: { w?: string; h?: string; f?: string; q?: string; e?: string }
  ): string {
    const ops = []

    // 1. Format
    if (params.f) {
      const format = params.f.toLowerCase()
      if (['jpeg', 'webp', 'avif', 'png'].includes(format)) {
        ops.push(`format=${format}`)
      }
    }

    // 2. Width
    if (params.w) {
      const width = parseInt(params.w)
      if (!isNaN(width) && width > 0) {
        ops.push(`width=${width}`)
      }
    }

    // 3. Height
    if (params.h) {
      const height = parseInt(params.h)
      if (!isNaN(height) && height > 0) {
        ops.push(`height=${height}`)
      }
    }

    // 4. Quality
    if (params.q) {
      let quality = parseInt(params.q)
      if (!isNaN(quality) && quality > 0) {
        if (quality > 100) quality = 100
        ops.push(`quality=${quality}`)
      }
    }

    const opsString = ops.length > 0 ? ops.join(',') : 'original'
    const basePath = `cdn/${key}/${opsString}`

    // If expiry is present, it MUST be part of the signable string
    return params.e ? `${basePath}?e=${params.e}` : basePath
  }
}
