import Joi from 'joi'

const brandName = Joi.string()
  .min(2)
  .max(250)
  .pattern(/^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/)
  .required()
  .messages({
    'string.pattern.base': 'Use letters and numbers with single spaces between words; no leading or trailing spaces',
  })

export const brandIdSchema = Joi.object({
  brandId: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),
}).required()

export const brandCreateSchema = Joi.object({ brandName }).required()

export const brandUpdateSchema = brandCreateSchema.keys({
  statusId: Joi.number().integer().valid(0, 1),
})

export const brandUpdatePayloadSchema = brandUpdateSchema.keys({
  brandId: Joi.number().integer().positive().max(Number.MAX_SAFE_INTEGER).required(),
})
