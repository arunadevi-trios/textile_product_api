export const groupSchemas = {
  Group: {
    type: 'object',
    required: ['groupId', 'groupName', 'statusId', 'recordFlag', 'subgroupCount'],
    properties: {
      groupId: { type: 'integer', format: 'int64', example: 1 },
      makerId: {
        type: 'integer',
        nullable: true,
        description: 'Authenticated user ID that created the group.',
      },
      groupName: { type: 'string', minLength: 2, maxLength: 250, example: 'Apparel' },
      statusId: { type: 'integer', enum: [0, 1], example: 1 },
      recordFlag: { type: 'integer', enum: [0, 1], example: 1 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      subgroupCount: { type: 'integer', example: 3 },
    },
  },
  GroupCreate: {
    type: 'object',
    required: ['groupName'],
    properties: {
      groupName: {
        type: 'string',
        minLength: 2,
        maxLength: 250,
        pattern: '^[A-Za-z0-9]+(?: [A-Za-z0-9]+)*$',
        example: 'Home Apparel',
      },
    },
  },
  GroupUpdate: {
    allOf: [
      { $ref: '#/components/schemas/GroupCreate' },
      {
        type: 'object',
        properties: { statusId: { type: 'integer', enum: [0, 1], example: 1 } },
      },
    ],
  },
}

export const groupPaths = {
  '/api/groups': {
    get: {
      tags: ['Groups'],
      summary: 'List groups',
      description: 'Returns groups for the authenticated tenant, including visible subgroup counts.',
      security: [{ bearerAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
        { $ref: '#/components/parameters/Status' },
        { $ref: '#/components/parameters/Search' },
      ],
      responses: {
        200: {
          description: 'Paginated groups.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'pagination'],
                properties: {
                  data: { type: 'array', items: { $ref: '#/components/schemas/Group' } },
                  pagination: { $ref: '#/components/schemas/Pagination' },
                },
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: {
          description: 'Authenticated account has no valid tenant.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
    post: {
      tags: ['Groups'],
      summary: 'Create a group',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/GroupCreate' } } },
      },
      responses: {
        201: {
          description: 'Group created.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: {
          description: 'Authenticated account has no valid tenant.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        409: {
          description: 'A visible group with that name already exists.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
  },
  '/api/groups/{id}': {
    parameters: [{ $ref: '#/components/parameters/Id' }],
    get: {
      tags: ['Groups'],
      summary: 'Get a group',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Group details.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: {
          description: 'Authenticated account has no valid tenant.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        404: { $ref: '#/components/responses/NotFound' },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
    put: {
      tags: ['Groups'],
      summary: 'Update a group',
      description: 'A group with visible subgroups cannot be deactivated.',
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/GroupUpdate' } } },
      },
      responses: {
        200: {
          description: 'Group updated.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Group' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: {
          description: 'Authenticated account has no valid tenant.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        404: { $ref: '#/components/responses/NotFound' },
        409: {
          description: 'Duplicate name or group has visible subgroups.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
    delete: {
      tags: ['Groups'],
      summary: 'Soft-delete a group',
      description: 'Sets recordFlag to 0. Deletion is blocked while visible subgroups exist.',
      security: [{ bearerAuth: [] }],
      responses: {
        204: { description: 'Group soft-deleted.' },
        401: { $ref: '#/components/responses/Unauthorized' },
        403: {
          description: 'Authenticated account has no valid tenant.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        404: { $ref: '#/components/responses/NotFound' },
        409: {
          description: 'Group has visible subgroups and cannot be deleted.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
  },
}
