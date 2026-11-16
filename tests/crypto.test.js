import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { before, test } from 'node:test'

let crypto

before(async () => {
  process.env.JWT_SECRET = randomBytes(32).toString('hex')
  process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test'
  crypto = await import('../src/utils/crypto.js')
})

test('passwords are stored as verifiable hashes', async () => {
  const passwordHash = await crypto.hashPassword('correct horse battery staple')
  assert.notEqual(passwordHash, 'correct horse battery staple')
  assert.equal(await crypto.verifyPassword('correct horse battery staple', passwordHash), true)
  assert.equal(await crypto.verifyPassword('wrong password', passwordHash), false)
})
