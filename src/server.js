import app from './app.js'
import { closeDatabase, connectDatabase } from './config/database.js'
import { env } from './config/env.js'

let server

try {
  await connectDatabase()
  server = app.listen(env.port, () => {
    console.log(`Textile Product API listening on port ${env.port}`)
  })
} catch (error) {
  console.error('Unable to start the API because the database connection failed.', error)
  await closeDatabase()
  process.exit(1)
}

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`)
  server.close(async (error) => {
    if (error) {
      console.error('Unable to close the HTTP server cleanly.', error)
      process.exitCode = 1
    }
    await closeDatabase()
  })
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))
