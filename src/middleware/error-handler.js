export function notFound(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested endpoint was not found.' },
  })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error)

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON.' },
    })
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size.' },
    })
  }
  if (error?.code === '23505') {
    return res.status(409).json({
      error: { code: 'USERNAME_EXISTS', message: 'An account with that username already exists.' },
    })
  }

  console.error(error)
  return res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected server error occurred.' },
  })
}
