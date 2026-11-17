export const authSchemas = {
  User: {
    type: 'object',
    properties: {
      id: { oneOf: [{ type: 'integer' }, { type: 'string' }], example: 1 },
      name: { type: 'string', example: 'admin1' },
      role: { type: 'string', nullable: true, example: null },
    },
  },
  AuthResponse: {
    type: 'object',
    required: ['accessToken', 'user'],
    properties: {
      accessToken: { type: 'string', description: 'Short-lived bearer JWT.' },
      user: { $ref: '#/components/schemas/User' },
    },
  },
}

export const authPaths = {
  '/api/auth/login': {
    post: {
      tags: ['Authentication'],
      summary: 'Log in',
      description: 'Returns an access token and sets the refresh token in an HttpOnly cookie. Limited to 10 attempts per IP per 15 minutes.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['username', 'password'],
              properties: {
                username: { type: 'string', minLength: 3, maxLength: 150, example: 'admin1' },
                password: { type: 'string', minLength: 1, maxLength: 128, format: 'password' },
                rememberMe: { type: 'boolean', default: false },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        400: { $ref: '#/components/responses/ValidationError' },
        401: {
          description: 'Invalid credentials.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        429: { description: 'Too many login attempts.' },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
  },
  '/api/auth/refresh': {
    post: {
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Uses and rotates the HttpOnly refresh-token cookie set by login.',
      responses: {
        200: {
          description: 'Session refreshed.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
        },
        401: {
          description: 'Refresh session is missing, invalid, or expired.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        403: {
          description: 'Request origin is not trusted.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
  },
  '/api/auth/logout': {
    post: {
      tags: ['Authentication'],
      summary: 'Log out',
      description: 'Revokes the refresh-token session, if present, and clears the HttpOnly cookie.',
      responses: {
        204: { description: 'Logged out.' },
        403: {
          description: 'Request origin is not trusted.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
        },
        500: { $ref: '#/components/responses/ServerError' },
      },
    },
  },
  '/api/auth/me': {
    get: {
      tags: ['Authentication'],
      summary: 'Get current authenticated user',
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Current user claims.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
                      role: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
}
