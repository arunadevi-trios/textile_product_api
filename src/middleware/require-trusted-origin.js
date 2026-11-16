import { env } from '../config/env.js'

const allowedOrigins = new Set(
  env.corsOrigin.split(',').map((origin) => origin.trim()),
)

export function requireTrustedOrigin(req, res, next) {
  const origin = req.get('origin')
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({
      error: { code: 'UNTRUSTED_ORIGIN', message: 'This origin is not allowed.' },
    })
  }
  next()
}
