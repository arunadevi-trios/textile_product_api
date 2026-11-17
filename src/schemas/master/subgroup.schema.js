import Joi from 'joi'
import { masterId } from './common.schema.js'

const subgroupName = Joi.string()
  .min(2)
  .max(250)
  .pattern(/^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/)
  .required()
  .messages({
    'string.pattern.base': '{{#label}} may contain only letters and numbers with single spaces between words.',
  })

export const subgroupCreateSchema = Joi.object({
  groupId: masterId,
  subgroupName,
}).required()

export const subgroupUpdateSchema = subgroupCreateSchema.keys({
  statusId: Joi.number().integer().valid(0, 1),
})

export const subgroupUpdatePayloadSchema = subgroupUpdateSchema.keys({
  subgroupId: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),
})
