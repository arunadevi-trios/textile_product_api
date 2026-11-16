import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || ''
  const [scheme, token, extra] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token || extra) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'A valid bearer token is required.' },
    })
  }

  try {
    req.auth = jwt.verify(token, env.jwtSecret, {
      issuer: 'textile-product-api',
    })
    next()
  } catch {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'The access token is invalid or expired.' },
    })
  }
}
