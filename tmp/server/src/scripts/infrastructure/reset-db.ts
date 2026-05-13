import logger from '../../logger/winston.logger'
import { postgresService } from '../../services/postgres.services'

/**
 * PostgreSQL Database Resetter
 * Exclusively wipes the image registry to allow for a clean local state.
 */
async function reset() {
  logger.info('\x1b[31m=== Database Registry Resetter ===\x1b[0m')
  logger.info("Dropping 'images' table...")

  try {
    await postgresService.query('DROP TABLE IF EXISTS images')
    logger.info('\x1b[32m\x1b[1mSUCCESS: Database table removed.\x1b[0m')
  } catch (e: any) {
    logger.error(`\x1b[31mFATAL: Database Reset failed:\x1b[0m\n${e.message}`)
    process.exit(1)
  } finally {
    await postgresService.close()
  }
}

reset()

