import { Pool } from 'pg';
import { env } from '../config/env';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const postgresService = {
  async query(text: string, params?: any[]) {
    try {
      const start = Date.now();
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`Executed query in ${duration}ms`, { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  async getAllImages() {
    return this.query('SELECT * FROM images ORDER BY created_at DESC');
  },

  async getImageById(id: string) {
    const result = await this.query('SELECT * FROM images WHERE id = $1', [id]);
    return result.rows[0];
  },

  async addImage(data: { key: string; name: string; type: string; size: string; url: string }) {
    const query = `
      INSERT INTO images (key, name, type, size, url, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await this.query(query, [data.key, data.name, data.type, data.size, data.url]);
    return result.rows[0];
  },

  async deleteImageById(id: string) {
    return this.query('DELETE FROM images WHERE id = $1', [id]);
  },
  
  async close() {
    await pool.end();
  }
};
