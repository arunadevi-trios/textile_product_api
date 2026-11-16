import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/error-handler.js'
import authRoutes from './routes/auth.routes.js'

const app = express()

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
  credentials: true,
}))
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})
app.use('/api/auth', authRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
