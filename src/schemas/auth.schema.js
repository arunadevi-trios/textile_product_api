import Joi from 'joi'

const username = Joi.string()
  .trim()
  .lowercase()
  .min(3)
  .max(150)
  .pattern(/^[^\s<>]+$/)
  .required()
  .messages({
    'string.pattern.base': '{{#label}} must not contain spaces or angle brackets.',
  })

export const loginSchema = Joi.object({
  username,
  password: Joi.string().min(1).max(128).required(),
  rememberMe: Joi.boolean().default(false),
}).required()

export const newUserSchema = Joi.object({
  username,
  password: Joi.string().min(12).max(128).required(),
}).required()
