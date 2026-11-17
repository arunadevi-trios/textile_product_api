import cors from 'cors'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env.js'
import { openapi } from './docs/openapi.js'
import { errorHandler, notFound } from './middleware/error-handler.js'
import authRoutes from './routes/auth.routes.js'
import groupRoutes from './routes/master/group.routes.js'
import subgroupRoutes from './routes/master/subgroup.routes.js'

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
app.get('/api-docs.json', (req, res) => {
  res.status(200).json(openapi)
})
app.use(
  '/api-docs',
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  }),
  swaggerUi.serve,
  swaggerUi.setup(openapi, { explorer: true }),
)
app.use('/api/auth', authRoutes)
app.use('/api/groups', groupRoutes)
app.use('/api/subgroups', subgroupRoutes)
app.use(notFound)
app.use(errorHandler)

export default app
