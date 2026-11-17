export const commonComponents = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  schemas: {
    ApiError: {
      type: 'object',
      required: ['error'],
      properties: {
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string', example: 'NOT_FOUND' },
            message: { type: 'string', example: 'Group was not found.' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'groupName' },
                  message: { type: 'string', example: '"groupName" is required' },
                },
              },
            },
          },
        },
      },
    },
    Pagination: {
      type: 'object',
      required: ['page', 'limit', 'total', 'totalPages'],
      properties: {
        page: { type: 'integer', example: 1 },
        limit: { type: 'integer', example: 20 },
        total: { type: 'integer', example: 42 },
        totalPages: { type: 'integer', example: 3 },
      },
    },
  },
  parameters: {
    Id: {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'integer', format: 'int64', minimum: 1 },
    },
    Page: {
      name: 'page',
      in: 'query',
      description: '1-based page number.',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    Limit: {
      name: 'limit',
      in: 'query',
      description: 'Page size (maximum 100).',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
    Status: {
      name: 'status',
      in: 'query',
      description: 'Filter by active/inactive status.',
      schema: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'active' },
    },
    Search: {
      name: 'search',
      in: 'query',
      description: 'Case-insensitive name search.',
      schema: { type: 'string', maxLength: 250 },
    },
    GroupId: {
      name: 'groupId',
      in: 'query',
      description: 'Filter subgroups by group.',
      schema: { type: 'integer', format: 'int64', minimum: 1 },
    },
  },
  responses: {
    ValidationError: {
      description: 'Request validation failed.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
    },
    Unauthorized: {
      description: 'Missing, invalid, or expired authentication.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
    },
    NotFound: {
      description: 'The resource was not found.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
    },
    ServerError: {
      description: 'Unexpected server error.',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
    },
  },
}
