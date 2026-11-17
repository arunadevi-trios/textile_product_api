import Joi from 'joi'

const id = Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required()

export const masterIdSchema = Joi.object({ id }).required()

export const masterListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive', 'all').default('active'),
  search: Joi.string().trim().max(250).allow(''),
  groupId: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER),
}).required()

export { id as masterId }
