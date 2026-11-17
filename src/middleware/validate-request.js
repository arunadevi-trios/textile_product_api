export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    })
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the submitted fields.',
          details: error.details.map((detail) => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        },
      })
    }
    const destination = source === 'body'
      ? 'validatedBody'
      : `validated${source[0].toUpperCase()}${source.slice(1)}`
    req[destination] = value
    next()
  }
}
