import logger from '../../logger/winston.logger'
import { LambdaClient, DeleteFunctionCommand } from '@aws-sdk/client-lambda'
import {
  IAMClient,
  DeleteRoleCommand,
  DetachRolePolicyCommand,
  ListAttachedRolePoliciesCommand,
} from '@aws-sdk/client-iam'
import { env } from '../../envs'
import { resetEnvFile, getAwsConfig } from '../utils/env-utils'

const lambdaClient = new LambdaClient(getAwsConfig())
const iamClient = new IAMClient(getAwsConfig())

const functionName = 'image-transformation-engine'
const roleName = 'image-transformation-engine-role'

async function deleteLambda() {
  logger.info(`Decommissioning Lambda function "${functionName}"...`)
  try {
    await lambdaClient.send(new DeleteFunctionCommand({ FunctionName: functionName }))
    logger.info('Lambda deleted.')
  } catch (e: any) {
    logger.warn('Lambda Cleanup Error:', e.message)
  }
}

async function deleteRole() {
  logger.info(`Decommissioning IAM Role "${roleName}"...`)
  try {
    const policies = await iamClient.send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }))
    if (policies.AttachedPolicies) {
      for (const policy of policies.AttachedPolicies) {
        await iamClient.send(new DetachRolePolicyCommand({ RoleName: roleName, PolicyArn: policy.PolicyArn }))
      }
    }
    await iamClient.send(new DeleteRoleCommand({ RoleName: roleName }))
    logger.info('IAM Role decommissioned.')
  } catch (e: any) {
    logger.warn('IAM Cleanup Error:', e.message)
  }
}

async function run() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  logger.info('\n\x1b[31m\x1b[1m=== Lambda & IAM Decommissioner ===\x1b[0m')
  await deleteLambda()
  await deleteRole()

  // Reset keys in .env
  resetEnvFile(['AWS_LAMBDA_ROLE_ARN', 'AWS_LAMBDA_FUNCTION_URL'])

  logger.info('\x1b[32m\x1b[1mSUCCESS: Lambda compute resources wiped clean!\x1b[0m')
}

run()

