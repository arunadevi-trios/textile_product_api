import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { currentUser, login, logout, refresh } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/require-auth.js'
import { requireTrustedOrigin } from '../middleware/require-trusted-origin.js'
import { validateRequest } from '../middleware/validate-request.js'
import { loginSchema } from '../schemas/auth.schema.js'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many login attempts. Try again later.' },
  },
})

router.post('/login', loginLimiter, validateRequest(loginSchema), login)
router.post('/refresh', requireTrustedOrigin, refresh)
router.post('/logout', requireTrustedOrigin, logout)
router.get('/me', requireAuth, currentUser)

export default router
