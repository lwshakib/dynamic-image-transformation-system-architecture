import logger from '../../logger/winston.logger'
import fs from 'fs'
import path from 'path'
import { INFRA_PLACEHOLDERS, env } from '../../envs'

export { INFRA_PLACEHOLDERS }

const envPath = path.join(__dirname, '../../../.env')

/**
 * Returns a safe AWS configuration object, filtering out placeholders
 * that could cause authentication failures during development.
 */
export function getAwsConfig() {
  const config: any = { region: env.AWS_REGION }
  
  // Directly use process.env to avoid build-time inlining issues
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKeyId && secretAccessKey && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.log(`[CONFIG] Using explicit AWS credentials from environment`)
    config.credentials = {
      accessKeyId,
      secretAccessKey,
    }
  } else {
    console.log(`[CONFIG] No explicit credentials (or in Lambda), relying on SDK default provider chain.`)
  }

  return config
}

/**
 * Updates or adds a key-value pair in the .env file.
 */
export function updateEnvFile(key: string, value: string) {
  try {
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, '')
    }
    let content = fs.readFileSync(envPath, 'utf8')
    const newLine = `${key}=${value}`
    const regex = new RegExp(`^${key}=.*`, 'm')

    if (content.match(regex)) {
      content = content.replace(regex, newLine)
    } else {
      content += `\n${newLine}\n`
    }

    fs.writeFileSync(envPath, content)
    logger.info(`\x1b[32mUpdated .env: ${key}=${value}\x1b[0m`)
  } catch (error: any) {
    logger.warn(`Could not automatically update .env for ${key}: ${error.message}`)
  }
}

/**
 * Resets multiple keys to an empty placeholder in the .env file.
 * This preserves the key structure and comments for documentation.
 */
export function resetEnvFile(keys: string[]) {
  try {
    if (!fs.existsSync(envPath)) return

    let content = fs.readFileSync(envPath, 'utf8')
    let lines = content.split('\n')

    const updatedLines = lines.map((line) => {
      const trimmed = line.trim()
      const matchingKey = keys.find((key) => trimmed.startsWith(`${key}=`))
      if (matchingKey) {
        const placeholder = (INFRA_PLACEHOLDERS as any)[matchingKey] || ''
        return `${matchingKey}=${placeholder}`
      }
      return line
    })

    fs.writeFileSync(envPath, updatedLines.join('\n'))
    logger.info(`\x1b[32mReset keys in .env to placeholders: ${keys.join(', ')}\x1b[0m`)
  } catch (error: any) {
    logger.warn(`Could not automatically reset .env: ${error.message}`)
  }
}
