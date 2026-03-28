import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

/**
 * Build Lambda Function for Dynamic Image Transformation
 * Logic: Bundle with Bun -> Install Linux-specific Sharp
 */
export async function buildLambda() {
  const projectRoot = path.join(__dirname, '../../..')
  const buildDir = path.join(projectRoot, 'lambda-build')

  console.log(`\n\x1b[36m\x1b[1m=== Lambda Build Tool ===\x1b[0m`)
  console.log(`Target: ${buildDir}`)

  // 1. Clean and create build directory
  if (fs.existsSync(buildDir)) {
    console.log('Cleaning old build artifacts...')
    fs.rmSync(buildDir, { recursive: true, force: true })
  }
  fs.mkdirSync(buildDir)

  // 2. Bundle the handler using Bun
  // Mark 'sharp' as external because we install its binary separately
  console.log('Bundling handler logic with Bun...')
  execSync(
    `bun build ./src/lambda/handler.ts --outfile ./lambda-build/index.js --target node --minify --external sharp`,
    {
      cwd: projectRoot,
      stdio: 'inherit',
    }
  )

  // 3. Create a minimal package.json for sharp installation
  // Version should ideally match the top-level package.json
  const pkgJson = {
    name: 'lambda-handler',
    type: 'module',
    private: true,
    dependencies: {
      sharp: '^0.34.5',
    },
  }
  fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify(pkgJson, null, 2))

  // 4. Install sharp for Linux x64 (AWS Lambda requirement)
  console.log('Installing sharp (linux-x64) binaries...')
  // Force linux-x64 with glibc for standard AWS Lambda Node.js runtimes
  execSync(`npm install --os=linux --cpu=x64 --libc=glibc sharp`, {
    cwd: buildDir,
    stdio: 'inherit',
  })

  console.log(`\n\x1b[32m\x1b[1mBUILD SUCCESSFUL\x1b[0m\x1b[32m: Lambda ready for deployment.\x1b[0m\n`)
}

// Execute if run directly
if (import.meta.main) {
  buildLambda().catch((err) => {
    console.error(`\x1b[31mBuild failed:\x1b[0m`, err)
    process.exit(1)
  })
}
