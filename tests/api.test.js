import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { after, before, test } from 'node:test'
import { newUserSchema } from '../src/schemas/auth.schema.js'
import { masterListSchema } from '../src/schemas/master/common.schema.js'
import { groupCreateSchema, groupUpdateSchema } from '../src/schemas/master/group.schema.js'
import { subgroupCreateSchema } from '../src/schemas/master/subgroup.schema.js'
import { brandCreateSchema } from '../src/schemas/master/brand.schema.js'
import { taxCreateSchema } from '../src/schemas/master/tax.schema.js'
import { normalizeTenantId } from '../src/utils/tenant-id.js'
import { errorHandler } from '../src/middleware/error-handler.js'
import { masterResponse } from '../src/middleware/master-response.js'

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
  assert.ok(specification.components.schemas.MasterResponse)
  assert.equal(specification.paths['/api/master/group/deleteGroup'].post.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/MasterResponse')
  assert.ok(!specification.paths['/api/master/brand/deleteBrand'].post.responses['204'])
  for (const path of [
    '/api/health',
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/master/group/getGroupList',
    '/api/master/group/setGroup',
    '/api/master/group/getGroupDetails',
    '/api/master/group/updateGroup',
    '/api/master/group/deleteGroup',
    '/api/master/subgroup/getSubgroupList',
    '/api/master/subgroup/setSubgroup',
    '/api/master/subgroup/getSubgroupDetails',
    '/api/master/subgroup/updateSubgroup',
    '/api/master/subgroup/deleteSubgroup',
    '/api/master/brand/getBrandList',
    '/api/master/brand/setBrand',
    '/api/master/brand/getBrandDetails',
    '/api/master/brand/updateBrand',
    '/api/master/brand/deleteBrand',
    '/api/master/tax/getTaxList',
    '/api/master/tax/setTax',
    '/api/master/tax/getTaxDetails',
    '/api/master/tax/updateTax',
    '/api/master/tax/deleteTax',
  ]) {
    assert.ok(specification.paths[path], `${path} should be documented`)
  }
  for (const path of [
    '/api/groups',
    '/api/subgroups',
    '/api/brands',
    '/api/taxes',
    '/api/master/group/getMasterList',
    '/api/master/brand/getMasterList',
  ]) {
    assert.ok(!specification.paths[path], `${path} should not be documented as a duplicate route`)
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
  assert.equal(payload.status, 400)
  assert.equal(payload.message, 'Invalid fields')
  assert.ok(payload.body.some(({ field }) => field === 'username'))
  assert.ok(payload.body.some(({ field }) => field === 'password'))
})

test('malformed JSON receives a client error response', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  })
  assert.equal(response.status, 400)
  const payload = await response.json()
  assert.equal(payload.status, 400)
  assert.equal(payload.message, 'Request body must contain valid JSON.')
})

test('unexpected API errors return the standard server error response', () => {
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
    send(body) {
      this.body = body
      return this
    },
  }
  const error = new Error('Unexpected database failure.')

  errorHandler(error, {}, response, () => assert.fail('Unexpected error forwarding'))

  assert.equal(response.statusCode, 500)
  assert.equal(response.body.message, 'An unexpected server error occurred.')
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

test('brand names use the group name constraints and permit up to 250 characters', () => {
  assert.equal(brandCreateSchema.validate({ brandName: 'Brand 12' }).error, undefined)
  assert.equal(brandCreateSchema.validate({ brandName: 'A'.repeat(250) }).error, undefined)
  for (const brandName of ['A', 'Brand-1', 'Brand  Name', 'A'.repeat(251)]) {
    assert.ok(brandCreateSchema.validate({ brandName }).error, `${brandName} should be rejected`)
  }
  assert.equal(
    brandCreateSchema.validate({ brandName: ' Brand' }).error.details[0].message,
    'Use letters and numbers with single spaces between words; no leading or trailing spaces',
  )
})

test('tax percentage accepts only integer values from 0 through 100', () => {
  for (const taxPercentage of [0, 2, 100]) {
    assert.equal(taxCreateSchema.validate({ taxPercentage }).error, undefined)
  }
  for (const taxPercentage of [-1, 101, 2.5, '2%']) {
    assert.ok(taxCreateSchema.validate({ taxPercentage }).error, `${taxPercentage} should be rejected`)
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

test('master responses include status, successcode, message, and preserve list pagination', () => {
  const makeResponse = (statusCode) => ({
    statusCode,
    json(body) {
      this.body = body
      return this
    },
  })

  const createResponse = makeResponse(201)
  masterResponse({ method: 'POST', path: '/setBrand' }, createResponse, () => {})
  createResponse.json({ status: '200', successcode: '201', message: 'Saved Successfully!', data: { brandId: 7, brandName: 'Brand7' } })
  assert.deepEqual(createResponse.body, {
    status: '200',
    successcode: '201',
    message: 'Saved Successfully!',
    data: { brandId: 7, brandName: 'Brand7' },
  })

  const listResponse = makeResponse(200)
  const pagination = { page: 1, limit: 10, total: 1, totalPages: 1 }
  masterResponse({ method: 'POST', path: '/getBrandList' }, listResponse, () => {})
  listResponse.json({
    status: '200',
    successcode: '206',
    message: 'Data Retrieved!',
    data: { brand_list: [{ brandId: 7 }], page: 1, limit: 10, total: 1 },
  })
  assert.deepEqual(listResponse.body, {
    status: '200',
    successcode: '206',
    message: 'Data Retrieved!',
    data: [{ brandId: 7 }],
    pagination: { ...pagination, total: 1 },
  })

  const deleteResponse = makeResponse(200)
  masterResponse({ method: 'POST', path: '/deleteBrand' }, deleteResponse, () => {})
  deleteResponse.json({ status: '200', successcode: '203', message: 'Deleted Successfully!', data: {} })
  assert.equal(deleteResponse.body.message, 'Deleted Successfully!')
  assert.equal(deleteResponse.body.successcode, '203')
})

test('group API validates names after authentication and before database access', async () => {
  const token = jwt.sign(
    { tenantId: 1 },
    process.env.JWT_SECRET,
    { subject: '1', issuer: 'textile-product-api', expiresIn: '5m' },
  )
  const response = await fetch(`${baseUrl}/api/master/group/setGroup`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ groupName: 'A-' }),
  })
  assert.equal(response.status, 400)
  const body = await response.json()
  assert.equal(body.message, 'Invalid fields')
  assert.equal(body.status, '400')
  assert.equal(body.successcode, '400')
  assert.ok(body.body.some(({ field }) => field === 'groupName'))
})

test('group and subgroup list endpoints are mounted and protected', async () => {
  for (const endpoint of [
    '/api/master/group/getGroupList',
    '/api/master/subgroup/getSubgroupList',
    '/api/master/brand/getBrandList',
    '/api/master/tax/getTaxList',
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
    const body = await response.json()
    assert.equal(body.error.code, 'UNAUTHORIZED')
    assert.equal(body.status, '401')
    assert.equal(body.successcode, '401')
    assert.equal(typeof body.message, 'string')
  }
})

test('duplicate master REST and generic action routes are no longer mounted', async () => {
  const token = jwt.sign(
    { tenantId: 1 },
    process.env.JWT_SECRET,
    { subject: '1', issuer: 'textile-product-api', expiresIn: '5m' },
  )
  for (const endpoint of [
    '/api/groups',
    '/api/subgroups',
    '/api/brands',
    '/api/taxes',
    '/api/master/group/getMasterList',
    '/api/master/subgroup/getMasterList',
    '/api/master/brand/getMasterList',
    '/api/master/tax/getMasterList',
  ]) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: '{}',
    })
    assert.equal(response.status, 404, `${endpoint} should not remain as a duplicate route`)
  }
})
