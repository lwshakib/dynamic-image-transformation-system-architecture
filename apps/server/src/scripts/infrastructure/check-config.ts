import logger from '../../logger/winston.logger'
import { LambdaClient, GetFunctionUrlConfigCommand, GetPolicyCommand } from '@aws-sdk/client-lambda'
import { env } from '../../envs'

const lambdaClient = new LambdaClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
})
const functionName = 'image-transformation-engine'

async function check() {
  try {
    logger.info('Checking Function URL Config...')
    const config = await lambdaClient.send(new GetFunctionUrlConfigCommand({ FunctionName: functionName }))
    logger.info('AuthType:', config.AuthType)
    logger.info('FunctionUrl:', config.FunctionUrl)

    logger.info('\nChecking Resource Policy...')
    try {
      const policy = await lambdaClient.send(new GetPolicyCommand({ FunctionName: functionName }))
      logger.info('Policy Document:', JSON.stringify(JSON.parse(policy.Policy || '{}'), null, 2))
    } catch (e: any) {
      logger.info('No policy found or error:', e.message)
    }
  } catch (e: any) {
    logger.error('Error:', e.message)
  }
}

check()

