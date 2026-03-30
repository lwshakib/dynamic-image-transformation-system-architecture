import logger from '../../logger/winston.logger'
import {
  CloudFrontClient,
  CreateDistributionCommand,
  GetDistributionCommand,
  UpdateDistributionCommand,
  CreateFunctionCommand,
  DescribeFunctionCommand,
  UpdateFunctionCommand,
  PublishFunctionCommand,
} from '@aws-sdk/client-cloudfront'
import { env } from '../../envs'
import fs from 'fs'
import path from 'path'
import { updateEnvFile } from '../utils/env-utils'

/**
 * AWS CloudFront Distribution Provisioner (High-Performance Architecture)
 * Configures CloudFront with:
 * 1. URL Path Rewriting (CloudFront Functions)
 * 2. Origin Failover (S3 -> Lambda Generation)
 * 3. Cache Optimization for on-the-fly transformations.
 */
const cloudFrontClient = new CloudFrontClient({ region: env.AWS_REGION })

// Managed Policies
const CACHE_POLICY_ID = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad' // CachingOptimized (Includes QueryStrings)
const ORIGIN_REQUEST_POLICY_ID = 'b689b0a8-53d0-40ab-baf2-68738e2966ac' // AllViewerExceptHost

async function setupCloudFrontFunction() {
  const functionName = 'UrlRewriteFunction'
  const tsPath = path.join(__dirname, '../../../lambda/url-rewrite.ts')

  if (!fs.existsSync(tsPath)) {
    throw new Error(`CloudFront Function source not found at ${tsPath}`)
  }

  let functionCode = fs.readFileSync(tsPath, 'utf8')

  // --- CRITICAL: Strip basic TypeScript types for CloudFront Function compatibility ---
  // CloudFront Functions (runtime 1.0) do not support TypeScript or modern JS features.
  // We strip types and the module.exports block to keep it pure JS.
  functionCode = functionCode
    .replace(/:\s*{[^}]*}/g, '') // Remove object type annotations
    .replace(/:\s*any/g, '') // Remove : any
    .replace(/:\s*{\s*\[key:\s*string\]:\s*string\s*}/g, '') // Remove specific map types
    .replace(/\/\/ @ts-ignore[\s\S]*$/, '') // Strip the module.exports block at the end

  try {
    logger.info(`Checking CloudFront Function: ${functionName}...`)
    const { FunctionSummary, ETag } = await cloudFrontClient.send(new DescribeFunctionCommand({ Name: functionName }))

    logger.info('Updating CloudFront Function...')
    await cloudFrontClient.send(
      new UpdateFunctionCommand({
        Name: functionName,
        IfMatch: ETag,
        FunctionConfig: {
          Comment: 'Normalized URL rewriting for image transformations',
          Runtime: 'cloudfront-js-1.0',
        },
        FunctionCode: Buffer.from(functionCode),
      })
    )
  } catch (error: any) {
    if (error.name === 'NoSuchFunctionExists') {
      logger.info('Creating new CloudFront Function...')
      await cloudFrontClient.send(
        new CreateFunctionCommand({
          Name: functionName,
          FunctionConfig: {
            Comment: 'Normalized URL rewriting for image transformations',
            Runtime: 'cloudfront-js-1.0',
          },
          FunctionCode: Buffer.from(functionCode),
        })
      )
    } else throw error
  }

  // Publish the function to get the latest ETag and ARN
  const { FunctionSummary, ETag } = await cloudFrontClient.send(new DescribeFunctionCommand({ Name: functionName }))
  const publishRes = await cloudFrontClient.send(
    new PublishFunctionCommand({
      Name: functionName,
      IfMatch: ETag,
    })
  )

  return publishRes.FunctionSummary?.FunctionMetadata?.FunctionARN
}

async function run() {
  logger.info('\x1b[36m=== High-Performance Edge Distribution Initializer ===\x1b[0m')

  try {
    // 1. Setup the CloudFront Function
    const functionArn = await setupCloudFrontFunction()
    if (!functionArn) throw new Error('Failed to deploy CloudFront Function.')
    logger.info(`CloudFront Function Ready: ${functionArn}`)

    // 2. Prepare Origin Configuration
    const lambdaUrl = env.AWS_LAMBDA_FUNCTION_URL || ''
    const lambdaDomain = lambdaUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const s3TransformedDomain = `${env.AWS_BUCKET_NAME_TRANSFORMED}.s3.${env.AWS_REGION}.amazonaws.com`

    const config = {
      CallerReference: Date.now().toString(),
      Comment: 'Digital Asset Transformation Edge (High-Perf)',
      Enabled: true,
      Origins: {
        Quantity: 2,
        Items: [
          {
            Id: 'S3TransformedOrigin',
            DomainName: s3TransformedDomain,
            S3OriginConfig: { OriginAccessIdentity: '' }, // Using Public/Open for blog demo
          },
          {
            Id: 'LambdaGenerationOrigin',
            DomainName: lambdaDomain,
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: 'https-only',
              OriginReadTimeout: 30,
              OriginKeepaliveTimeout: 5,
              OriginSslProtocols: {
                Quantity: 3,
                Items: ['TLSv1', 'TLSv1.1', 'TLSv1.2'],
              },
            },
          },
        ],
      },
      OriginGroups: {
        Quantity: 1,
        Items: [
          {
            Id: 'ImageOptimizationGroup',
            FailoverCriteria: {
              StatusCodes: {
                Quantity: 2,
                Items: [403, 404],
              },
            },
            Members: {
              Quantity: 2,
              Items: [{ OriginId: 'S3TransformedOrigin' }, { OriginId: 'LambdaGenerationOrigin' }],
            },
          },
        ],
      },
      DefaultCacheBehavior: {
        TargetOriginId: 'ImageOptimizationGroup', // Failover Group
        ViewerProtocolPolicy: 'redirect-to-https',
        CachePolicyId: CACHE_POLICY_ID,
        OriginRequestPolicyId: ORIGIN_REQUEST_POLICY_ID,
        FunctionAssociations: {
          Quantity: 1,
          Items: [
            {
              FunctionARN: functionArn,
              EventType: 'viewer-request',
            },
          ],
        },
      },
    }

    // Add required fields to Origin items
    config.Origins.Items = config.Origins.Items.map((origin) => ({
      OriginPath: '',
      CustomHeaders: { Quantity: 0 },
      ...origin,
    }))

    const distributionId = env.CLOUDFRONT_DISTRIBUTION_ID

    if (distributionId) {
      logger.info(`Updating existing Distribution: ${distributionId}...`)
      const { Distribution, ETag } = await cloudFrontClient.send(new GetDistributionCommand({ Id: distributionId }))

      if (!Distribution?.DistributionConfig) throw new Error('Could not find distribution config')

      const finalConfig = {
        ...Distribution.DistributionConfig,
        ...config,
        // Keep these from existing
        CallerReference: Distribution.DistributionConfig.CallerReference,
        Aliases: Distribution.DistributionConfig.Aliases,
        DefaultRootObject: Distribution.DistributionConfig.DefaultRootObject,
        ViewerCertificate: Distribution.DistributionConfig.ViewerCertificate,
        Origins: config.Origins,
        OriginGroups: config.OriginGroups,
        DefaultCacheBehavior: {
          ...Distribution.DistributionConfig.DefaultCacheBehavior,
          ...config.DefaultCacheBehavior,
        },
      }

      const updateRes = await cloudFrontClient.send(
        new UpdateDistributionCommand({
          Id: distributionId,
          IfMatch: ETag,
          DistributionConfig: finalConfig as any,
        })
      )

      logger.info(`\x1b[32mSuccessfully updated distribution!\x1b[0m`)
      updateEnvFile('CLOUDFRONT_DOMAIN', updateRes.Distribution?.DomainName || '')
    } else {
      logger.info('Creating new High-Performance Distribution...')
      const createRes = await cloudFrontClient.send(
        new CreateDistributionCommand({
          DistributionConfig: config as any,
        })
      )

      const finalId = createRes.Distribution?.Id || ''
      const finalDomain = createRes.Distribution?.DomainName || ''

      updateEnvFile('CLOUDFRONT_DISTRIBUTION_ID', finalId)
      updateEnvFile('CLOUDFRONT_DOMAIN', finalDomain)
      logger.info(`\x1b[32mSUCCESS: Edge Infrastructure Ready!\x1b[0m`)
    }

    // --- Propagation Warning ---
    logger.info('\n\x1b[33m\x1b[1m⚠️  IMPORTANT: Propagation Period Required ⚠️\x1b[0m')
    logger.info('CloudFront distributions take 15-20 minutes to fully propagate globally.')
    logger.info("Until the status in the AWS Console reaches 'Deployed', you may experience")
    logger.info("'403 Forbidden' or '404 Not Found' errors.")
    logger.info('\nPlease monitor the AWS CloudFront Dashboard before testing transformations.')
  } catch (error: any) {
    logger.error(`\n\x1b[31mFATAL: CloudFront Setup Error:\x1b[0m\n${error.message}`)
    process.exit(1)
  }
}

run()
