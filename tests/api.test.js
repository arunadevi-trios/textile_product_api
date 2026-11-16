import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { after, before, test } from 'node:test'
import { newUserSchema } from '../src/schemas/auth.schema.js'

let baseUrl
let server

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex')
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test'
  const { default: app } = await import('../src/app.js')
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (!server) return
  server.closeAllConnections()
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

test('health endpoint responds without a database connection', async () => {
  const response = await fetch(`${baseUrl}/api/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
})

test('login validates the request body before accessing the database', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'bad user', password: '' }),
  })
  assert.equal(response.status, 400)
  const payload = await response.json()
  assert.equal(payload.error.code, 'VALIDATION_ERROR')
  assert.ok(payload.error.details.some(({ field }) => field === 'username'))
  assert.ok(payload.error.details.some(({ field }) => field === 'password'))
})

test('malformed JSON receives a client error response', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error.code, 'INVALID_JSON')
})

test('refresh without a session cookie is unauthorized', async () => {
  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.equal(response.status, 401)
  assert.equal((await response.json()).error.code, 'INVALID_SESSION')
})

test('refresh rejects untrusted browser origins', async () => {
  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://untrusted.example' },
    body: '{}',
  })
  assert.equal(response.status, 403)
  assert.equal((await response.json()).error.code, 'UNTRUSTED_ORIGIN')
})

test('Joi validates and normalizes new-user input', () => {
  const { error, value } = newUserSchema.validate({
    username: ' admin@example.com ',
    password: 'a sufficiently long password',
    extra: 'removed',
  }, { abortEarly: false, stripUnknown: true })

  assert.equal(error, undefined)
  assert.deepEqual(value, {
    username: 'admin@example.com',
    password: 'a sufficiently long password',
  })
})
