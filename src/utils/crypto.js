import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const PASSWORD_KEY_LENGTH = 64

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH)
  return `scrypt$${salt.toString('base64')}$${derivedKey.toString('base64')}`
}

export async function verifyPassword(password, passwordHash) {
  const [algorithm, saltValue, hashValue, extra] = passwordHash.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !hashValue || extra) return false

  const salt = Buffer.from(saltValue, 'base64')
  const expected = Buffer.from(hashValue, 'base64')
  if (salt.length !== 16 || expected.length !== PASSWORD_KEY_LENGTH) return false

  const actual = await scrypt(password, salt, expected.length)
  return timingSafeEqual(actual, expected)
}
