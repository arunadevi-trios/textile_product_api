import { closeDatabase, connectDatabase } from '../config/database.js'
import { newUserSchema } from '../schemas/auth.schema.js'
import { createUser } from '../services/auth.service.js'

const { error, value } = newUserSchema.validate({
  username: process.env.NEW_USER_USERNAME,
  password: process.env.NEW_USER_PASSWORD,
}, { abortEarly: false, stripUnknown: true })

if (error) {
  console.error(error.details.map(({ message }) => message).join('\n'))
  process.exitCode = 1
} else {
  try {
    await connectDatabase()
    await createUser(value)
    console.log(`Created account for ${value.username}.`)
  } catch (error) {
    if (error?.code === '23505') {
      console.error('An account with that username already exists.')
    } else {
      console.error('Unable to create the account.', error)
    }
    process.exitCode = 1
  } finally {
    await closeDatabase()
  }
}
