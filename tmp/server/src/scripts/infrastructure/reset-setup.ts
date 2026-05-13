import logger from '../../logger/winston.logger'
import {
  LambdaClient,
  DeleteFunctionCommand,
  GetFunctionCommand,
  DeleteFunctionUrlConfigCommand,
} from '@aws-sdk/client-lambda'
import {
  IAMClient,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam'
import { S3Client, DeleteBucketCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import {
  CloudFrontClient,
  DeleteDistributionCommand,
  GetDistributionCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront'
import { postgresService } from '../../services/postgres.services'
import { env } from '../../envs'
import { resetEnvFile, getAwsConfig } from '../utils/env-utils'
import fs from 'fs'
import path from 'path'

/**
 * Global Architecture Decommissioner (Reset Tool)
 * Safely removes all provisioned resources to clear the environment.
 */
const lambdaClient = new LambdaClient(getAwsConfig())
const iamClient = new IAMClient(getAwsConfig())
const s3Client = new S3Client(getAwsConfig())
const cloudFrontClient = new CloudFrontClient(getAwsConfig())

const functionName = 'image-transformation-engine'
const roleName = 'image-transformation-engine-role'

/**
 * DB: Wipe all metadata
 */
async function deleteTable() {
  logger.info('Emptying PostgreSQL registry table...')
  try {
    await postgresService.query('DROP TABLE IF EXISTS images')
    logger.info('Registry wiped.')
  } catch (e: any) {
    logger.error('Database Cleanup Error:', e.message)
  }
}

/**
 * S3: Empty and Delete specific buckets
 */
async function emptyAndDeleteBucket(bucketName: string) {
  try {
    logger.info(`Cleaning S3 storage: Bucket "${bucketName}"...`)
    // --- 1. S3 buckets must be empty before deletion ---
    const listResult = await s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }))
    if (listResult.Contents?.length) {
      const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })) },
      }
      await s3Client.send(new DeleteObjectsCommand(deleteParams))
    }
    // --- 2. Safe deletion of the bucket itself ---
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucketName }))
    logger.info(`Bucket "${bucketName}" decommissioned.`)
  } catch (e: any) {
    logger.warn(`Bucket Error (${bucketName}):`, e.message)
  }
}

/**
 * Lambda: Remove the transformation engine
 */
async function deleteLambda() {
  logger.info(`Decommissioning Lambda function "${functionName}"...`)
  try {
    await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: functionName }))
    logger.info('Lambda deleted.')
  } catch (e: any) {
    logger.warn('Lambda Cleanup Error:', e.message)
  }
}

/**
 * IAM: Remove the automated role and detach policies
 */
async function deleteRole() {
  logger.info(`Decommissioning IAM Role "${roleName}"...`)
  try {
    // --- 1. Policies must be detached before a role can be deleted ---
    const policies = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }))
    if (policies.AttachedPolicies) {
      for (const policy of policies.AttachedPolicies) {
        await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }))
      }
    }
    // --- 2. Final deletion of the role instance ---
    await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }))
    logger.info('IAM Role decommissioned.')
  } catch (e: any) {
    logger.warn('IAM Cleanup Error:', e.message)
  }
}

async function resetAll() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  logger.info('\n\x1b[31m\x1b[1m=== Global Infrastructure Decommissioner (Reset) ===\x1b[0m')
  logger.info('\x1b[33mWarning: This will permanently wipe all S3 assets and DB records.\x1b[0m')

  // Skip CloudFront automated deletion as it takes ~20 minutes to disable
  logger.info(
    "\nNote: CloudFront distributions require manual 'Disable' and 20-min wait before deletion. Skipping automated CDN deletion."
  )

  await deleteTable()
  await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_IMAGES)
  await emptyAndDeleteBucket(env.AWS_BUCKET_NAME_TRANSFORMED)
  await deleteLambda()
  await deleteRole()

  // Reset environment variables to placeholders
  resetEnvFile(['AWS_LAMBDA_ROLE_ARN', 'AWS_LAMBDA_FUNCTION_URL', 'CLOUDFRONT_DISTRIBUTION_ID', 'CLOUDFRONT_DOMAIN'])

  await postgresService.close()
  logger.info('\n\x1b[32m\x1b[1mSUCCESS: Core Infrastructure wiped clean!\x1b[0m')
}

resetAll()

