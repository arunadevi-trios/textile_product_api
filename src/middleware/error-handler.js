import { defaultServerResponse } from '../constants/index.js';

export function notFound(req, res) {
  res.status(404).send({
    ...defaultServerResponse,
    status: 404,
    message: 'The requested endpoint was not found.',
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).send({
      ...defaultServerResponse,
      message: 'Request body must contain valid JSON.',
    });
  }
  if (error?.type === 'entity.too.large') {
    return res.status(413).send({
      ...defaultServerResponse,
      status: 413,
      message: 'Request body exceeds the allowed size.',
    });
  }

  console.error(error);
  return res.status(500).send({
    ...defaultServerResponse,
    status: 500,
    message: 'An unexpected server error occurred.',
  });
}
