import { defaultServerResponse, requestValidationMessage } from '../constants/index.js';

const validateObjectSchema = (data, schema) => {
  const result = schema.validate(data, { convert: false, abortEarly: false, stripUnknown: true });
  if (result.error) {
    const errorDetails = result.error.details.map(value => ({
      error: value.message,
      path: value.path,
      field: value.path.join('.'),
      message: value.message,
    }));
    return errorDetails;
  }
  return null;
};

/** Validate request body against a Joi schema (apiSchema pattern) */
export function validateBody(schema) {
  return (req, res, next) => {
    const response = { ...defaultServerResponse };
    const error = validateObjectSchema(req.body, schema);
    if (error) {
      response.body = error;
      response.message = requestValidationMessage.BAD_REQUEST;
      return res.status(response.status).send(response);
    }
    return next();
  };
}

/** Validate query params against a Joi schema (apiSchema pattern) */
export function validateQueryParams(schema) {
  return (req, res, next) => {
    const response = { ...defaultServerResponse };
    const error = validateObjectSchema(req.query, schema);
    if (error) {
      response.body = error;
      response.message = requestValidationMessage.BAD_REQUEST;
      return res.status(response.status).send(response);
    }
    return next();
  };
}

/** Validate request (original method - kept for backward compatibility) */
export function validateRequest(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const response = { ...defaultServerResponse };
      response.body = error.details.map(detail => ({
        error: detail.message,
        field: detail.path.join('.'),
        message: detail.message,
      }));
      response.message = requestValidationMessage.BAD_REQUEST;
      return res.status(response.status).send(response);
    }
    const destination = source === 'body'
      ? 'validatedBody'
      : `validated${source[0].toUpperCase()}${source.slice(1)}`;
    req[destination] = value;
    next();
  };
}
