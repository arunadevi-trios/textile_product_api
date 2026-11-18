import Joi from 'joi'

const taxPercentage = Joi.number().integer().min(0).max(100).required()

export const taxIdSchema = Joi.object({
  taxId: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),
}).required()

export const taxCreateSchema = Joi.object({ taxPercentage }).required()

export const taxUpdateSchema = taxCreateSchema.keys({
  statusId: Joi.number().integer().valid(0, 1),
})

export const taxUpdatePayloadSchema = taxUpdateSchema.keys({
  taxId: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),
})
