import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { pool } from '../config/database.js'
import { hashPassword, verifyPassword } from '../utils/crypto.js'

function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function createAccessToken(user) {
  return jwt.sign(
    { role: user.userrole_id ?? null },
    env.jwtSecret,
    {
      subject: String(user.id),
      expiresIn: env.jwtExpiresIn,
      issuer: 'textile-product-api',
    },
  )
}

function createRefreshToken() {
  return randomBytes(48).toString('base64url')
}

function getSessionExpiry(rememberMe) {
  const duration = rememberMe
    ? env.refreshTokenDays * 24 * 60 * 60 * 1000
    : env.sessionTokenHours * 60 * 60 * 1000
  return new Date(Date.now() + duration)
}

function toSafeUser(user) {
  return { id: user.id, name: user.user_name, role: user.userrole_id ?? null }
}

export async function authenticateUser(username, password, rememberMe) {
  const { rows } = await pool.query(
    `SELECT user_id AS id, user_name, password, userrole_id
       FROM tbl_users
      WHERE LOWER(user_name) = $1 AND status = 1
      LIMIT 1`,
    [username.trim().toLowerCase()],
  )
  const user = rows[0]
  if (!user || !(await verifyPassword(password, user.password))) {
    return null
  }

  const refreshToken = createRefreshToken()
  await pool.query(
    `INSERT INTO tbl_user_session (
       user_id, session_token_hash, login_at, expires_at,
       created_at, updated_at, status_id, remember_me
     )
     VALUES ($1, $2, NOW(), $3, NOW(), NOW(), 1, $4)`,
    [user.id, hashRefreshToken(refreshToken), getSessionExpiry(rememberMe), rememberMe],
  )

  return {
    accessToken: createAccessToken(user),
    refreshToken,
    user: toSafeUser(user),
    rememberMe,
  }
}

export async function refreshUserSession(refreshToken) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const sessionResult = await client.query(
      `SELECT uid, user_id, remember_me
         FROM tbl_user_session
        WHERE session_token_hash = $1
          AND status_id = 1
          AND logout_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
        FOR UPDATE`,
      [hashRefreshToken(refreshToken)],
    )
    const session = sessionResult.rows[0]
    if (!session) {
      await client.query('ROLLBACK')
      return null
    }

    const userResult = await client.query(
      `SELECT user_id AS id, user_name, userrole_id
         FROM tbl_users
        WHERE user_id = $1 AND status = 1
        LIMIT 1`,
      [session.user_id],
    )
    const user = userResult.rows[0]
    if (!user) {
      await client.query(
        `UPDATE tbl_user_session
            SET logout_at = NOW(), updated_at = NOW(), status_id = 0
          WHERE uid = $1`,
        [session.uid],
      )
      await client.query('COMMIT')
      return null
    }

    const nextRefreshToken = createRefreshToken()
    await client.query(
      `UPDATE tbl_user_session
          SET session_token_hash = $1, expires_at = $2, updated_at = NOW()
        WHERE uid = $3`,
      [
        hashRefreshToken(nextRefreshToken),
        getSessionExpiry(session.remember_me),
        session.uid,
      ],
    )
    await client.query('COMMIT')
    return {
      accessToken: createAccessToken(user),
      refreshToken: nextRefreshToken,
      user: toSafeUser(user),
      rememberMe: session.remember_me,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function revokeUserSession(refreshToken) {
  await pool.query(
    `UPDATE tbl_user_session
        SET logout_at = NOW(), updated_at = NOW(), status_id = 0
      WHERE session_token_hash = $1
        AND status_id = 1
        AND logout_at IS NULL`,
    [hashRefreshToken(refreshToken)],
  )
}

export async function createUser({ username, password }) {
  const passwordHash = await hashPassword(password)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query('LOCK TABLE tbl_users IN EXCLUSIVE MODE')

    const normalizedUsername = username.trim().toLowerCase()
    const existing = await client.query(
      'SELECT 1 FROM tbl_users WHERE LOWER(user_name) = $1 LIMIT 1',
      [normalizedUsername],
    )
    if (existing.rowCount) {
      const error = new Error('An account with that username already exists.')
      error.code = '23505'
      throw error
    }

    const tenantResult = await client.query(
      'SELECT tenant_id FROM tbl_tenant WHERE status_id = 1 ORDER BY tenant_id LIMIT 1',
    )
    if (!tenantResult.rowCount) {
      throw new Error('Cannot create an account because no active tenant exists.')
    }

    const ids = await client.query(
      `SELECT COALESCE(MAX(user_id), 0) + 1 AS user_id
         FROM tbl_users`,
    )
    const { rows } = await client.query(
      `INSERT INTO tbl_users (
         tenant_id, user_id, user_name, password, created_at, updated_at, status
       )
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)
       RETURNING uid, user_id AS id, user_name, userrole_id`,
      [
        tenantResult.rows[0].tenant_id,
        ids.rows[0].user_id,
        normalizedUsername,
        passwordHash,
      ],
    )
    await client.query('COMMIT')
    return rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
