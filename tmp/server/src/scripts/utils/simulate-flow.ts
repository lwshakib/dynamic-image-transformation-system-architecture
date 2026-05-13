import logger from '../../logger/winston.logger'
import crypto from 'crypto'
import { env } from '../../envs'

const SECRET = env.SIGNING_SECRET

function getNormalizedPath(key: string, params: any): string {
  const ops: string[] = []
  const opsString = ops.length > 0 ? ops.join(',') : 'original'
  const basePath = `cdn/${key}/${opsString}`
  return params.e ? `${basePath}?e=${params.e}` : basePath
}

function generateSignature(key: string, params: any): string {
  const normalizedPath = getNormalizedPath(key, params)
  return crypto.createHmac('sha256', SECRET).update(normalizedPath).digest('hex').substring(0, 16)
}

function validateSignature(targetPathBase: string, signature: string, expiry?: string): boolean {
  const signableString = expiry ? `${targetPathBase}?e=${expiry}` : targetPathBase
  const expected = crypto.createHmac('sha256', SECRET).update(signableString).digest('hex').substring(0, 16)
  return signature === expected
}

// SIMULATION
const originalKeyFromDb = 'secure/uploads/Kyoto in vintage.jpg'
const expires = '1774697808'

// 1. Server generates signature
const sig = generateSignature(originalKeyFromDb, { e: expires })
logger.info('Server Generated Sig:', sig)

// 2. CloudFront URL
const viewerUrl = `https://cdn.com/cdn/secure/uploads/Kyoto%20in%20vintage.jpg?s=${sig}&e=${expires}`
logger.info('Viewer URL:', viewerUrl)

// 3. CloudFront Function Rewrites
const uri = '/cdn/secure/uploads/Kyoto%20in%20vintage.jpg'
const originalImagePath = uri.replace('/cdn/', '')
const rewrittenUri = '/cdn/' + originalImagePath + '/original'
logger.info('Rewritten URI:', rewrittenUri)

// 4. Lambda Receives rawPath
const rawPath = rewrittenUri

// 5. Lambda extracts targetCacheKey
let targetCacheKey = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath
targetCacheKey = decodeURIComponent(targetCacheKey.replace(/\+/g, ' '))
logger.info('Lambda targetCacheKey:', targetCacheKey)

// 6. Validation
const isValid = validateSignature(targetCacheKey, sig, expires)
logger.info('Is Valid?', isValid)

