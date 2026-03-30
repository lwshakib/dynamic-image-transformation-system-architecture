import logger from '../../logger/winston.logger'
import pg from 'pg'
import { env } from '../../config/env'

async function checkDb() {
  const client = new pg.Client({ connectionString: env.DATABASE_URL })
  await client.connect()

  try {
    const res = await client.query('SELECT * FROM images WHERE name LIKE $1', ['%Kyoto%'])
    logger.info(JSON.stringify(res.rows, null, 2))
  } finally {
    await client.end()
  }
}

checkDb()

