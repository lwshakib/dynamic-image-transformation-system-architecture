import { postgresService } from '../../services/postgres.service'

/**
 * PostgreSQL Database Resetter
 * Exclusively wipes the image registry to allow for a clean local state.
 */
async function reset() {
  console.log('\x1b[31m=== Database Registry Resetter ===\x1b[0m')
  console.log("Dropping 'images' table...")

  try {
    await postgresService.query('DROP TABLE IF EXISTS images')
    console.log('\x1b[32m\x1b[1mSUCCESS: Database table removed.\x1b[0m')
  } catch (e: any) {
    console.error(`\x1b[31mFATAL: Database Reset failed:\x1b[0m\n${e.message}`)
    process.exit(1)
  } finally {
    await postgresService.close()
  }
}

reset()

