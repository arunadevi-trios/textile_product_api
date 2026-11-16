import 'dotenv/config'

function required(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const jwtSecret = required('JWT_SECRET')
if (jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long')
}

const refreshCookieSameSite = ['strict', 'lax', 'none'].includes(
  (process.env.REFRESH_COOKIE_SAME_SITE || 'lax').toLowerCase(),
) ? (process.env.REFRESH_COOKIE_SAME_SITE || 'lax').toLowerCase() : 'lax'
const refreshCookieSecure = process.env.REFRESH_COOKIE_SECURE === 'true'
  || process.env.NODE_ENV === 'production'
  || refreshCookieSameSite === 'none'

export const env = Object.freeze({
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: required('DATABASE_URL'),
  pgSsl: process.env.PG_SSL === 'true',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  sessionTokenHours: Number(process.env.SESSION_TOKEN_HOURS || 12),
  refreshCookieName: 'textile_refresh',
  refreshCookieSecure,
  refreshCookieSameSite,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
})
