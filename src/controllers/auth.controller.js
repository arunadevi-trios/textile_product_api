import { env } from '../config/env.js'
import {
  authenticateUser,
  refreshUserSession,
  revokeUserSession,
} from '../services/auth.service.js'

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.refreshCookieSecure,
    sameSite: env.refreshCookieSameSite,
    path: '/api/auth',
  }
}

function setRefreshCookie(res, refreshToken, rememberMe) {
  const options = refreshCookieOptions()
  if (rememberMe) options.maxAge = env.refreshTokenDays * 24 * 60 * 60 * 1000
  res.cookie(env.refreshCookieName, refreshToken, options)
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, refreshCookieOptions())
}

export async function login(req, res, next) {
  try {
    const result = await authenticateUser(
      req.validatedBody.username,
      req.validatedBody.password,
      req.validatedBody.rememberMe,
    )
    if (!result) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Username or password is incorrect.' },
      })
    }
    setRefreshCookie(res, result.refreshToken, result.rememberMe)
    return res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    })
  } catch (error) {
    return next(error)
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies[env.refreshCookieName]
    if (!refreshToken) {
      clearRefreshCookie(res)
      return res.status(401).json({
        error: { code: 'INVALID_SESSION', message: 'Your session has expired. Please sign in again.' },
      })
    }

    const result = await refreshUserSession(refreshToken)
    if (!result) {
      clearRefreshCookie(res)
      return res.status(401).json({
        error: { code: 'INVALID_SESSION', message: 'Your session has expired. Please sign in again.' },
      })
    }
    setRefreshCookie(res, result.refreshToken, result.rememberMe)
    return res.status(200).json({
      accessToken: result.accessToken,
      user: result.user,
    })
  } catch (error) {
    return next(error)
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies[env.refreshCookieName]
    if (refreshToken) await revokeUserSession(refreshToken)
    clearRefreshCookie(res)
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
}

export function currentUser(req, res) {
  return res.status(200).json({
    user: { id: req.auth.sub, role: req.auth.role },
  })
}
