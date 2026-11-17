import Joi from 'joi'

const groupName = Joi.string()
  .min(2)
  .max(250)
  .pattern(/^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$/)
  .required()
  .messages({
    'string.pattern.base': '{{#label}} may contain only letters and numbers with single spaces between words.',
  })

export const groupCreateSchema = Joi.object({
  groupName,
}).required()

export const groupUpdateSchema = groupCreateSchema.keys({
  statusId: Joi.number().integer().valid(0, 1),
})
