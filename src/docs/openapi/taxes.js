export const taxSchemas = {
  Tax: {
    type: 'object',
    required: ['taxId', 'taxPercentage', 'statusId', 'recordFlag'],
    properties: {
      taxId: { type: 'integer', format: 'int64', example: 1 },
      taxPercentage: { type: 'integer', minimum: 0, maximum: 100, example: 18 },
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
  TaxCreate: {
    type: 'object',
    required: ['taxPercentage'],
    properties: {
      taxPercentage: { type: 'integer', minimum: 0, maximum: 100, example: 2 },
    },
  },
  TaxUpdate: {
    allOf: [
      { $ref: '#/components/schemas/TaxCreate' },
      {
        type: 'object',
        required: ['taxId'],
        properties: {
          taxId: { type: 'integer', format: 'int64', example: 1 },
          statusId: { type: 'integer', enum: [0, 1], example: 0 },
        },
      },
    ],
  },
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

export const taxPaths = {
  '/api/master/tax/getTaxList': {
    post: {
      tags: ['Taxes'],
      summary: 'List taxes with pagination and filters',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: listRequest } } },
      responses: { 200: { description: 'Paginated taxes with the standard master response fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },
  '/api/master/tax/setTax': {
    post: {
      tags: ['Taxes'],
      summary: 'Create a tax rate',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxCreate' } } } },
      responses: { 201: { description: 'Tax created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 409: { description: 'Duplicate tax percentage.' } },
    },
  },
  '/api/master/tax/getTaxDetails': {
    post: {
      tags: ['Taxes'],
      summary: 'Get tax details',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['taxId'],
              properties: { taxId: { type: 'integer', format: 'int64' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Tax details.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },
  '/api/master/tax/updateTax': {
    post: {
      tags: ['Taxes'],
      summary: 'Update or deactivate a tax rate',
      security: [{ bearerAuth: [] }],
      requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TaxUpdate' } } } },
      responses: { 200: { description: 'Tax updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' }, 409: { description: 'Duplicate tax percentage.' } },
    },
  },
  '/api/master/tax/deleteTax': {
    post: {
      tags: ['Taxes'],
      summary: 'Soft-delete a tax rate',
      description: 'Sets tx_delflag to 1.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['taxId'],
              properties: { taxId: { type: 'integer', format: 'int64' } },
            },
          },
        },
      },
      responses: { 200: { description: 'Tax soft-deleted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } }, 401: { $ref: '#/components/responses/Unauthorized' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
  },
}
