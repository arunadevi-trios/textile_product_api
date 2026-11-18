export const subgroupSchemas = {
  Subgroup: {
    type: 'object',
    required: ['subgroupId', 'subgroupName', 'groupId', 'groupName', 'statusId', 'recordFlag'],
    properties: {
      subgroupId: { type: 'integer', format: 'int64', example: 1 },
      subgroupName: { type: 'string', minLength: 2, maxLength: 250, example: 'Mens Wear' },
      groupId: { type: 'integer', format: 'int64', example: 1 },
      groupName: { type: 'string', example: 'Apparel' },
      makerId: {
        type: 'integer',
        nullable: true,
        description: 'Authenticated user ID that created the subgroup.',
      },
      statusId: { type: 'integer', enum: [0, 1], example: 1 },
      recordFlag: {
        type: 'integer',
        enum: [0, 1],
        example: 0,
        description: '0 for an existing row; 1 for a soft-deleted row.',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  SubgroupCreate: {
    type: 'object',
    required: ['groupId', 'subgroupName'],
    properties: {
      groupId: { type: 'integer', format: 'int64', example: 1 },
      subgroupName: {
        type: 'string',
        minLength: 2,
        maxLength: 250,
        pattern: '^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$',
        example: 'Mens Wear',
      },
    },
  },
  SubgroupUpdate: {
    allOf: [
      { $ref: '#/components/schemas/SubgroupCreate' },
      {
        type: 'object',
        required: ['subgroupId'],
        properties: {
          subgroupId: { type: 'integer', format: 'int64', example: 1 },
          statusId: { type: 'integer', enum: [0, 1], example: 1 },
        },
      },
    ],
  },
}

export const subgroupPaths = {
  '/api/master/subgroup/getSubgroupList': {
    post: {
      tags: ['Subgroups'],
      summary: 'List subgroups using a JSON filter payload',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                page: { type: 'integer', minimum: 1, default: 1 },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                status: { type: 'string', enum: ['active', 'inactive', 'all'], default: 'active' },
                search: { type: 'string', maxLength: 250 },
                groupId: { type: 'integer', format: 'int64' },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Paginated subgroups with the standard master response fields.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/master/subgroup/setSubgroup': {
    post: {
      tags: ['Subgroups'],
      summary: 'Create a subgroup',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SubgroupCreate' },
          },
        },
      },
      responses: {
        201: { description: 'Subgroup created.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/api/master/subgroup/getSubgroupDetails': {
    post: {
      tags: ['Subgroups'],
      summary: 'Get subgroup details',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['subgroupId'],
              properties: { subgroupId: { type: 'integer', format: 'int64' } },
            },
          },
        },
      },
      responses: {
        200: { description: 'Subgroup details.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/master/subgroup/updateSubgroup': {
    post: {
      tags: ['Subgroups'],
      summary: 'Update a subgroup',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SubgroupUpdate' },
          },
        },
      },
      responses: {
        200: { description: 'Subgroup updated.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/api/master/subgroup/deleteSubgroup': {
    post: {
      tags: ['Subgroups'],
      summary: 'Soft-delete a subgroup',
      description: 'Sets sg_delflag to 1 so the row is hidden from list and detail results.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['subgroupId'],
              properties: { subgroupId: { type: 'integer', format: 'int64' } },
            },
          },
        },
      },
      responses: {
        200: { description: 'Subgroup soft-deleted.', content: { 'application/json': { schema: { $ref: '#/components/schemas/MasterResponse' } } } },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
}
