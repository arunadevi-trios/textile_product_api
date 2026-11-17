export const healthPaths = {
  '/api/health': {
    get: {
      tags: ['Health'],
      summary: 'Check API health',
      responses: {
        200: {
          description: 'API is available.',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { status: { type: 'string', example: 'ok' } },
              },
            },
          },
        },
      },
    },
  },
}
