import { authPaths, authSchemas } from './openapi/auth.js'
import { commonComponents } from './openapi/common.js'
import { groupPaths, groupSchemas } from './openapi/groups.js'
import { healthPaths } from './openapi/health.js'
import { subgroupPaths, subgroupSchemas } from './openapi/subgroups.js'

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Textile Product API',
    version: '1.0.0',
    description: 'Authentication and tenant-scoped group and subgroup master endpoints.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health', description: 'API availability' },
    { name: 'Authentication', description: 'Login and session management' },
    { name: 'Groups', description: 'Tenant-scoped group master' },
    { name: 'Subgroups', description: 'Tenant-scoped subgroup master' },
  ],
  components: {
    ...commonComponents,
    schemas: {
      ...commonComponents.schemas,
      ...authSchemas,
      ...groupSchemas,
      ...subgroupSchemas,
    },
  },
  paths: {
    ...healthPaths,
    ...authPaths,
    ...groupPaths,
    ...subgroupPaths,
  },
}
