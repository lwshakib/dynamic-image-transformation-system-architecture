import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { transformationService } from '../services/transformation.service'

/**
 * AWS Lambda Execution Handler (Blog-Inspired Architecture)
 * Optimized for CloudFront Origin Failover + CloudFront Functions path rewriting.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Incoming Event:', JSON.stringify(event, null, 2))

  try {
    // 1. Path Parsing (Supports normalized paths from CloudFront Function)
    // Expected format: /cdn/original-image.jpg/format=webp,width=100
    // OR: /cdn/original-image.jpg/original
    // @ts-ignore
    const rawPath = event.rawPath || event.path || ''
    const queryParams = event.queryStringParameters || {}
    const signature = queryParams.s
    const expires = queryParams.e // Expiration timestamp (seconds)

    // Check expiry if present
    if (expires) {
      const currentTime = Math.floor(Date.now() / 1000)
      if (parseInt(expires) < currentTime) {
        const error = new Error('Forbidden: This link has expired.')
        ;(error as any).name = 'ForbiddenError'
        throw error
      }
    }

    // Split the path to get original key and operations
    const pathParts = rawPath.split('/').map((p: string) => {
      try {
        return decodeURIComponent(p)
      } catch (e) {
        return p
      }
    })
    // e.g., ["", "cdn", "folder", "img with space.jpg", "format=webp,width=100"]

    const operationsPrefix = pathParts.pop() || '' // "format=webp,width=300" or "original"

    // Remove "cdn" from parts if it exists at the start
    if (pathParts[1] === 'cdn') {
      pathParts.splice(1, 1)
    }

    const originalKey = pathParts.filter((p: string) => p).join('/') // "folder/img with space.jpg"

    if (!originalKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing image key in URL path', path: rawPath }),
      }
    }

    // 2. Parse Operations
    const ops: any = {}
    if (operationsPrefix === 'original') {
      ops.original = true
    } else {
      operationsPrefix.split(',').forEach((op: string) => {
        const [k, v] = op.split('=')
        if (k && v) ops[k] = v
      })
    }

    // 3. Transformation / Retrieval
    // The targetCacheKey is EXACTLY the path CloudFront requested from S3
    // which is the rawPath without the leading slash.
    // CRITICAL: We MUST decode the path to match the signature generation logic.
    let targetCacheKey = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath
    try {
      // Decode potential %20 or + characters
      targetCacheKey = decodeURIComponent(targetCacheKey.replace(/\+/g, ' '))
    } catch (e) {
      console.warn('Path decoding failed:', e)
    }

    const { buffer, contentType } = await transformationService.transformImage(originalKey, targetCacheKey, {
      ...ops,
      signature,
      expires,
    })

    // 4. Return the image content directly
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Long cache for variants
        Vary: 'Accept', // Important for auto-format detection
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error: any) {
    console.error('Lambda Transformation Panic:', error)

    if (error.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Image not found in original bucket' }),
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Critical Error during Edge Transformation',
        details: error.message,
      }),
    }
  }
}
