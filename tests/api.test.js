import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { after, before, test } from 'node:test'
import { newUserSchema } from '../src/schemas/auth.schema.js'
import { masterListSchema } from '../src/schemas/master/common.schema.js'
import { groupCreateSchema, groupUpdateSchema } from '../src/schemas/master/group.schema.js'
import { subgroupCreateSchema } from '../src/schemas/master/subgroup.schema.js'
import { normalizeTenantId } from '../src/utils/tenant-id.js'
import { errorHandler } from '../src/middleware/error-handler.js'

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

test('Swagger endpoints expose the complete API specification and UI', async () => {
  const specificationResponse = await fetch(`${baseUrl}/api-docs.json`)
  assert.equal(specificationResponse.status, 200)
  const specification = await specificationResponse.json()
  assert.equal(specification.openapi, '3.0.3')
  for (const path of [
    '/api/health',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/groups',
    '/api/groups/{id}',
    '/api/subgroups',
    '/api/subgroups/{id}',
    '/api/master/group/getMasterList',
    '/api/master/group/setMaster',
    '/api/master/group/getMasterDetails',
    '/api/master/group/updateMaster',
    '/api/master/group/deleteMaster',
    '/api/master/subgroup/getMasterList',
    '/api/master/subgroup/setMaster',
    '/api/master/subgroup/getMasterDetails',
    '/api/master/subgroup/updateMaster',
    '/api/master/subgroup/deleteMaster',
  ]) {
    assert.ok(specification.paths[path], `${path} should be documented`)
  }
  const operationCount = Object.values(specification.paths)
    .reduce((total, path) => total + Object.keys(path)
      .filter((method) => ['get', 'post', 'put', 'delete'].includes(method)).length, 0)
  assert.equal(operationCount, 25)

  const uiResponse = await fetch(`${baseUrl}/api-docs/`)
  assert.equal(uiResponse.status, 200)
  assert.match(uiResponse.headers.get('content-type'), /text\/html/)
  assert.match(await uiResponse.text(), /Swagger UI/)
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

test('group conflict errors return a clear conflict response', () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  const error = new Error('Groups with subgroups cannot be deactivated or deleted.')
  error.code = 'GROUP_HAS_SUBGROUPS'

  errorHandler(error, {}, response, () => assert.fail('Unexpected error forwarding'))

  assert.equal(response.statusCode, 409)
  assert.deepEqual(response.body.error, {
    code: 'GROUP_HAS_SUBGROUPS',
    message: 'Groups with subgroups cannot be deactivated or deleted.',
  })
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

test('master names allow spaces but only letters and numbers otherwise', () => {
  assert.equal(groupCreateSchema.validate({ groupName: 'A1' }).error, undefined)
  assert.equal(groupCreateSchema.validate({ groupName: 'Home Goods' }).error, undefined)
  for (const groupName of [
    'A',
    'A-1',
    'ÉÉ',
    '  ',
    ' Home',
    'Home ',
    'Home  Goods',
  ]) {
    assert.ok(groupCreateSchema.validate({ groupName }).error, `${groupName} should be rejected`)
  }
})

test('subgroup input requires a group id and allows spaces in its name', () => {
  assert.equal(
    subgroupCreateSchema.validate({ groupId: 3, subgroupName: 'Mens Wear12' }).error,
    undefined,
  )
  for (const subgroupName of [' Mens', 'Mens ', 'Mens  Wear']) {
    assert.ok(
      subgroupCreateSchema.validate({ groupId: 3, subgroupName }).error,
      `${subgroupName} should be rejected`,
    )
  }
  assert.ok(subgroupCreateSchema.validate({ subgroupName: 'Wear12' }).error)
  assert.ok(subgroupCreateSchema.validate({ groupId: 3, subgroupName: 'A' }).error)
})

test('master updates accept only valid active/inactive status values', () => {
  assert.equal(groupUpdateSchema.validate({ groupName: 'Group1', statusId: 0 }).error, undefined)
  assert.ok(groupUpdateSchema.validate({ groupName: 'Group1', statusId: 2 }).error)
})

test('JWT tenant IDs accept safe numeric strings and reject invalid values', () => {
  assert.equal(normalizeTenantId('1'), 1)
  assert.equal(normalizeTenantId(1), 1)
  assert.equal(normalizeTenantId('0'), null)
  assert.equal(normalizeTenantId('1.5'), null)
  assert.equal(normalizeTenantId('9007199254740992'), null)
})

test('master list payload validates server pagination and status filters', () => {
  assert.deepEqual(masterListSchema.validate({}).value, {
    page: 1,
    limit: 20,
    status: 'active',
  })
  assert.equal(
    masterListSchema.validate({ page: '2', limit: '50', status: 'inactive', groupId: '4' }).error,
    undefined,
  )
  assert.ok(masterListSchema.validate({ limit: '1000' }).error)
  assert.ok(masterListSchema.validate({ status: 'enabled' }).error)
})

test('group API validates names after authentication and before database access', async () => {
  const token = jwt.sign(
    { tenantId: 1 },
    process.env.JWT_SECRET,
    { subject: '1', issuer: 'textile-product-api', expiresIn: '5m' },
  )
  const response = await fetch(`${baseUrl}/api/groups`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ groupName: 'A-' }),
  })
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR')
})

test('group and subgroup list endpoints are mounted and protected', async () => {
  for (const endpoint of [
    '/api/groups',
    '/api/subgroups',
    '/api/master/group/getMasterList',
    '/api/master/subgroup/getMasterList',
  ]) {
    const isPayloadEndpoint = endpoint.includes('/master/')
    const response = await fetch(`${baseUrl}${endpoint}`, isPayloadEndpoint
      ? {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ page: 1 }),
        }
      : undefined)
    assert.equal(response.status, 401, `${endpoint} should require authentication, not return 404`)
    assert.equal((await response.json()).error.code, 'UNAUTHORIZED')
  }
})
