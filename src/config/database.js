import pg from 'pg'
import { env } from './env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.pgSsl ? { rejectUnauthorized: true } : false,
})

export async function connectDatabase() {
  await pool.query('SELECT 1')
  await pool.query(`
    ALTER TABLE tbl_user_session
    ADD COLUMN IF NOT EXISTS remember_me BOOLEAN NOT NULL DEFAULT FALSE
  `)
}

export async function closeDatabase() {
  await pool.end()
}
