import { Pool } from 'pg'
import { env } from '../envs'
import logger from '../logger/winston.logger'

/**
 * PostgreSQL Service
 * Handles all database interactions using the 'pg' library with connection pooling.
 * This service manages the lifecycle of the DB connections and ensures data persistence.
 */
class PostgresService {
  private pool: Pool

  constructor() {
    // 1. Initialize the connection pool using the provided database URL
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      // Handle the upcoming security changes in node-postgres by explicitly verifying cloud DBs
      ssl: env.DATABASE_URL.includes('sslmode=verify-full') || env.DATABASE_URL.includes('neon.tech'),
    })

    // 2. Global DB error handling to catch unexpected pool disconnects
    this.pool.on('error', (err) => {
      logger.error(`Unexpected error on idle client: ${err.message}`)
      process.exit(-1)
    })
  }

  /**
   * General-purpose query method for executing SQL commands.
   */
  async query(text: string, params?: any[]) {
    return this.pool.query(text, params)
  }

  /**
   * Fetches all images from the DB, ordered by creation date (newest first).
   */
  async getAllImages() {
    return this.pool.query('SELECT * FROM images ORDER BY created_at DESC')
  }

  /**
   * Fetches a specific image by its unique ID.
   */
  async getImageById(id: string) {
    const result = await this.pool.query('SELECT * FROM images WHERE id = $1', [id])
    return result.rows[0]
  }

  /**
   * Adds metadata for a newly uploaded image to the database.
   * This is used for distribution and listing in the gallery.
   */
  async addImage(image: { key: string; name: string; type: string; size: string; path: string; secure: boolean }) {
    const { key, name, type, size, path, secure } = image
    return this.pool.query(
      'INSERT INTO images (key, name, type, size, path, secure) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [key, name, type, size, path, secure]
    )
  }

  /**
   * Deletes an image record from the database by ID.
   */
  async deleteImageById(id: string) {
    return this.pool.query('DELETE FROM images WHERE id = $1', [id])
  }

  /**
   * Closes all connections in the pool safely (useful for shutdown/reset scripts).
   */
  async close() {
    await this.pool.end()
  }
}

// Export a single instance (Singleton) for application-wide use
export const postgresService = new PostgresService()
