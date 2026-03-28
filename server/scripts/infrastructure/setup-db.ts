import { postgresService } from '../../src/services/postgres.service'
import { env } from '../../src/config/env'
import fs from 'fs'
import path from 'path'

/**
 * PostgreSQL Schema Initializer
 * Automates the creation of the core data structure in the local or remote database.
 * This is the first step in correctly configuring your local development environment.
 */
async function setup() {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  console.log('\x1b[36m=== DB Infrastructure Initializer ===\x1b[0m')

  try {
    // 1. Read the schema.sql file from the current directory
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // 2. Execute the schema (This will drop/create the 'images' table as defined)
    console.log(`Executing schema.sql on ${process.env.DATABASE_URL}...`)
    const result = await postgresService.query(schema)

    console.log('\n\x1b[32m\x1b[1mSUCCESS: Database Registry setup complete!\x1b[0m')
  } catch (e: any) {
    console.error(`\n\x1b[31mFATAL: Database Setup failed:\x1b[0m\n${e.message}`)
    process.exit(1)
  }
}

setup()
