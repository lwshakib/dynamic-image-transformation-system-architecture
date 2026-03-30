import logger from '../../logger/winston.logger'
import {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  CreateFunctionUrlConfigCommand,
  GetFunctionUrlConfigCommand,
  UpdateFunctionUrlConfigCommand,
  AddPermissionCommand,
  UpdateFunctionConfigurationCommand,
} from '@aws-sdk/client-lambda'
import { IAMClient, CreateRoleCommand, GetRoleCommand, AttachRolePolicyCommand } from '@aws-sdk/client-iam'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import { execSync } from 'child_process'
import { env } from '../../config/env'
import { updateEnvFile } from '../utils/env-utils'

/**
 * AWS Lambda Infrastructure Deployer
 * Automates the packaging and deployment of the on-the-fly engine to AWS.
 */
const lambdaClient = new LambdaClient({ region: env.AWS_REGION })
const iamClient = new IAMClient({ region: env.AWS_REGION })
const functionName = 'image-transformation-engine'
const roleName = 'image-transformation-engine-role'

async function buildLambda() {
  const projectRoot = path.join(__dirname, '../../..')
  logger.info(`\x1b[36mCalling Lambda build automation...\x1b[0m`)
  execSync(`bun run lambda:build`, {
    cwd: projectRoot,
    stdio: 'inherit',
  })
}

async function createZip() {
  return new Promise<Buffer>((resolve, reject) => {
    const buildDir = path.join(__dirname, '../../../lambda-build')
    const chunks: Buffer[] = []
    const archive = archiver('zip', { zlib: { level: 9 } })

    archive.on('data', (chunk) => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', (err) => reject(err))

    // Zip the contents of lambda-build (now contains bundled index.js and node_modules/sharp)
    archive.directory(buildDir, false)
    archive.finalize()
  })
}

async function getOrCreateRole() {
  try {
    const result = await iamClient.send(new GetRoleCommand({ RoleName: roleName }))
    updateEnvFile('AWS_LAMBDA_ROLE_ARN', result.Role!.Arn!)
    return result.Role!.Arn!
  } catch (error: any) {
    if (error.name === 'NoSuchEntity' || error.name === 'NoSuchEntityException') {
      const assumeRolePolicy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }],
      })
      const createResult = await iamClient.send(
        new CreateRoleCommand({ RoleName: roleName, AssumeRolePolicyDocument: assumeRolePolicy })
      )
      const roleArn = createResult.Role!.Arn!
      await iamClient.send(
        new AttachRolePolicyCommand({ RoleName: roleName, PolicyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess' })
      )
      await iamClient.send(
        new AttachRolePolicyCommand({
          RoleName: roleName,
          PolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
        })
      )
      logger.info('Waiting for IAM Role propagation (10s)...')
      await new Promise((r) => setTimeout(r, 10000))
      updateEnvFile('AWS_LAMBDA_ROLE_ARN', roleArn)
      return roleArn
    }
    throw error
  }
}

async function ensureFunctionUrl() {
  let functionUrl = ''
  try {
    logger.info('Checking for existing Function URL...')
    const response = await lambdaClient.send(new GetFunctionUrlConfigCommand({ FunctionName: functionName }))

    // --- CRITICAL FIX: Explicitly enforce NONE auth type if it was previously IAM ---
    if (response.AuthType !== 'NONE') {
      logger.info(`Correcting Function URL AuthType from ${response.AuthType} to NONE...`)
      const updateResponse = await lambdaClient.send(
        new UpdateFunctionUrlConfigCommand({
          FunctionName: functionName,
          AuthType: 'NONE',
        })
      )
      functionUrl = updateResponse.FunctionUrl!
    } else {
      functionUrl = response.FunctionUrl!
    }
    logger.info('Function URL verified:', functionUrl)
    updateEnvFile('AWS_LAMBDA_FUNCTION_URL', functionUrl)
  } catch (error: any) {
    logger.info('Creating new Function URL Config with NONE auth...')
    const createResponse = await lambdaClient.send(
      new CreateFunctionUrlConfigCommand({
        FunctionName: functionName,
        AuthType: 'NONE',
      })
    )
    functionUrl = createResponse.FunctionUrl!
    updateEnvFile('AWS_LAMBDA_FUNCTION_URL', functionUrl)
  }

  // Always ensure the public invoke permission is attached (both InvokeFunctionUrl and InvokeFunction are required since 2025)
  try {
    logger.info('Ensuring Public InvokeURL Permission...')
    await lambdaClient.send(
      new AddPermissionCommand({
        FunctionName: functionName,
        StatementId: 'FunctionUrlAllowPublic',
        Action: 'lambda:InvokeFunctionUrl',
        Principal: '*',
        FunctionUrlAuthType: 'NONE',
      })
    )
    logger.info('InvokeURL permission verified.')
  } catch (error: any) {
    if (error.name === 'ResourceConflictException') {
      logger.info('InvokeURL permission already exists.')
    } else {
      logger.warn('Permission Warning (InvokeURL):', error.message)
    }
  }

  try {
    logger.info('Ensuring Public InvokeFunction Permission (Required for URLs)...')
    await lambdaClient.send(
      new AddPermissionCommand({
        FunctionName: functionName,
        StatementId: 'FunctionUrlInvokeAllowPublic',
        Action: 'lambda:InvokeFunction',
        Principal: '*',
        // Applying InvokeFunction via URL flag if supported by SDK, otherwise standard public invoke
        // @ts-ignore - Some SDK versions use this property for the --invoked-via-function-url flag
        InvokedViaFunctionUrl: true,
      } as any)
    )
    logger.info('InvokeFunction permission verified.')
  } catch (error: any) {
    if (error.name === 'ResourceConflictException') {
      logger.info('InvokeFunction permission already exists.')
    } else {
      logger.warn('Permission Warning (InvokeFunction):', error.message)
    }
  }
}

async function run() {
  logger.info(`\n\x1b[35m\x1b[1m=== AWS Lambda Deployment CLI ===\x1b[0m`)
  try {
    await buildLambda()
    const roleArn = await getOrCreateRole()
    const zipBuffer = await createZip()

    let exists = false
    try {
      await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }))
      exists = true
    } catch {}

    if (exists) {
      logger.info(`Updating existing function logic for "${functionName}"...`)
      await lambdaClient.send(new UpdateFunctionCodeCommand({ FunctionName: functionName, ZipFile: zipBuffer }))

      // --- CRITICAL FIX: Wait for the code update to complete before updating configuration ---
      logger.info('Waiting for code update to stabilize...')
      let status = ''
      while (status !== 'Successful') {
        await new Promise((r) => setTimeout(r, 2000))
        const res = await lambdaClient.send(new GetFunctionCommand({ FunctionName: functionName }))
        status = res.Configuration?.LastUpdateStatus || ''
        process.stdout.write('.')
      }
      logger.info('\nCode update complete.')

      // Also ensure the handler and environment are updated
      await lambdaClient.send(
        new UpdateFunctionConfigurationCommand({
          FunctionName: functionName,
          Handler: 'index.handler',
          Environment: {
            Variables: {
              AWS_BUCKET_NAME_IMAGES: env.AWS_BUCKET_NAME_IMAGES,
              AWS_BUCKET_NAME_TRANSFORMED: env.AWS_BUCKET_NAME_TRANSFORMED,
              DATABASE_URL: env.DATABASE_URL,
              SIGNING_SECRET: env.SIGNING_SECRET,
            },
          },
        })
      )
    } else {
      logger.info(`Creating fresh Lambda function "${functionName}"...`)
      await lambdaClient.send(
        new CreateFunctionCommand({
          FunctionName: functionName,
          Runtime: 'nodejs18.x',
          Role: roleArn,
          Handler: 'index.handler',
          Code: { ZipFile: zipBuffer },
          Timeout: 60,
          MemorySize: 2048,
          Environment: {
            Variables: {
              AWS_BUCKET_NAME_IMAGES: env.AWS_BUCKET_NAME_IMAGES,
              AWS_BUCKET_NAME_TRANSFORMED: env.AWS_BUCKET_NAME_TRANSFORMED,
              DATABASE_URL: env.DATABASE_URL,
              SIGNING_SECRET: env.SIGNING_SECRET,
            },
          },
        })
      )
    }

    await ensureFunctionUrl()
    logger.info(`\n\x1b[32m\x1b[1mSUCCESS: Operation for "${functionName}" complete!\x1b[0m`)
  } catch (error: any) {
    logger.error(`\n\x1b[31mFATAL: Deployment error:\x1b[0m\n${error.message}`)
    process.exit(1)
  }
}

run()
