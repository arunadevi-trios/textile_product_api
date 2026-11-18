export const brandSchemas = {
  Brand: {
    type: 'object',
    required: ['brandId', 'brandName', 'statusId', 'recordFlag'],
    properties: {
      brandId: { type: 'integer', format: 'int64', example: 1 },
      brandName: { type: 'string', minLength: 2, maxLength: 250, example: 'Home Goods' },
      makerId: { type: 'integer', nullable: true },
      statusId: { type: 'integer', enum: [0, 1], example: 1 },
      recordFlag: {
        type: 'integer',
        enum: [0, 1],
        description: '0 for an existing row; 1 for a soft-deleted row.',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  BrandCreate: {
    type: 'object',
    required: ['brandName'],
    properties: {
      brandName: {
        type: 'string',
        minLength: 2,
        maxLength: 250,
        pattern: '^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$',
        example: 'Home Goods',
      },
    },
  },
  BrandUpdate: {
    allOf: [
      { $ref: '#/components/schemas/BrandCreate' },
      {
        type: 'object',
        required: ['brandId'],
        properties: {
          brandId: { type: 'integer', format: 'int64', example: 1 },
          statusId: { type: 'integer', enum: [0, 1], example: 0 },
        },
      },
    ],
  },
}

const pageResponses = {
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { description: 'Authenticated account has no valid tenant.' },
  500: { $ref: '#/components/responses/ServerError' },
}

const listRequest = {
  type: 'object',
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    status: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'active' },
    search: { type: 'string', maxLength: 250 },
  },
}

export const brandPaths = {
  '/api/master/brand/getBrandList': {
    post: {
      tags: ['Brands'],
      summary: 'List brands with pagination and filters',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: listRequest } } },
      responses: { 200: { description: 'Paginated brands with the standard master response fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 400: pageResponses[400], 401: pageResponses[401] },
    },
  },
  '/api/master/brand/setBrand': {
    post: {
      tags: ['Brands'],
      summary: 'Create a brand',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BrandCreate' } } } },
      responses: { 201: { description: 'Brand created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 400: pageResponses[400], 401: pageResponses[401], 409: { description: 'Duplicate brand name.' } },
    },
  },
  '/api/master/brand/getBrandDetails': {
    post: {
      tags: ['Brands'],
      summary: 'Get brand details',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['brandId'], properties: { brandId: { type: 'integer', format: 'int64' } } } } } },
      responses: { 200: { description: 'Brand details.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 401: pageResponses[401], 404: { $ref: '#/components/responses/NotFound' } },
    },
  },
  '/api/master/brand/updateBrand': {
    post: {
      tags: ['Brands'],
      summary: 'Update or deactivate a brand',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BrandUpdate' } } } },
      responses: { 200: { description: 'Brand updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 400: pageResponses[400], 401: pageResponses[401], 404: { $ref: '#/components/responses/NotFound' }, 409: { description: 'Duplicate brand name.' } },
    },
  },
  '/api/master/brand/deleteBrand': {
    post: {
      tags: ['Brands'],
      summary: 'Soft-delete a brand',
      description: 'Sets br_delflag to 1.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['brandId'],
              properties: { brandId: { type: 'integer', format: 'int64' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Brand soft-deleted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 401: pageResponses[401], 404: { $ref: '#/components/responses/NotFound' } },
    },
  },
}
