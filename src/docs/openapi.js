import { authPaths, authSchemas } from './openapi/auth.js'
import { brandPaths, brandSchemas } from './openapi/brands.js'
import { commonComponents } from './openapi/common.js'
import { groupPaths, groupSchemas } from './openapi/groups.js'
import { healthPaths } from './openapi/health.js'
import { subgroupPaths, subgroupSchemas } from './openapi/subgroups.js'
import { taxPaths, taxSchemas } from './openapi/taxes.js'

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Textile Product API',
    version: '1.0.0',
    description: 'Authentication and tenant-scoped master data endpoints.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health', description: 'API availability' },
    { name: 'Authentication', description: 'Login and session management' },
    { name: 'Groups', description: 'Tenant-scoped group master' },
    { name: 'Subgroups', description: 'Tenant-scoped subgroup master' },
    { name: 'Brands', description: 'Tenant-scoped brand master' },
    { name: 'Taxes', description: 'Tenant-scoped tax master' },
  ],
  components: {
    ...commonComponents,
    schemas: {
      ...commonComponents.schemas,
      ...authSchemas,
      ...groupSchemas,
      ...subgroupSchemas,
      ...brandSchemas,
      ...taxSchemas,
    },
  },
  paths: {
    ...healthPaths,
    ...authPaths,
    ...groupPaths,
    ...subgroupPaths,
    ...brandPaths,
    ...taxPaths,
  },
}
