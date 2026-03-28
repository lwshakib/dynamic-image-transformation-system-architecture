import fs from 'fs'
import path from 'path'

const envPath = path.join(__dirname, '../../.env')

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
      content += `\n# Automated Infrastructure ${key}\n${newLine}\n`
    }

    fs.writeFileSync(envPath, content)
    console.log(`\x1b[32mUpdated .env: ${key}=${value}\x1b[0m`)
  } catch (error: any) {
    console.warn(`Could not automatically update .env for ${key}: ${error.message}`)
  }
}

/**
 * Removes multiple keys and their automated comments from the .env file.
 */
export function removeFromEnv(keys: string[]) {
  try {
    if (!fs.existsSync(envPath)) return

    let content = fs.readFileSync(envPath, 'utf8')
    let lines = content.split('\n')

    const filteredLines = lines.filter((line) => {
      const trimmed = line.trim()
      const isTargetKey = keys.some((key) => trimmed.startsWith(`${key}=`))
      const isTargetComment = keys.some((key) => trimmed.startsWith(`# Automated Infrastructure ${key}`))
      return !isTargetKey && !isTargetComment
    })

    const finalContent = filteredLines.join('\n').replace(/\n{3,}/g, '\n\n')

    fs.writeFileSync(envPath, finalContent)
    console.log(`\x1b[32mScrubbed keys from .env: ${keys.join(', ')}\x1b[0m`)
  } catch (error: any) {
    console.warn(`Could not automatically scrub .env: ${error.message}`)
  }
}
