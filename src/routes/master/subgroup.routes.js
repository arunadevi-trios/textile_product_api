import { Router } from 'express'
import {
  createSubgroup,
  deleteSubgroup,
  getSubgroup,
  listSubgroups,
  updateSubgroup,
} from '../../controllers/master/subgroup.controller.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { validateRequest } from '../../middleware/validate-request.js'
import { masterIdSchema, masterListSchema } from '../../schemas/master/common.schema.js'
import {
  subgroupCreateSchema,
  subgroupUpdateSchema,
} from '../../schemas/master/subgroup.schema.js'

const router = Router()

router.use(requireAuth)

router.get('/', validateRequest(masterListSchema, 'query'), listSubgroups)
router.post('/', validateRequest(subgroupCreateSchema), createSubgroup)
router.get('/:id', validateRequest(masterIdSchema, 'params'), getSubgroup)
router.put(
  '/:id',
  validateRequest(masterIdSchema, 'params'),
  validateRequest(subgroupUpdateSchema),
  updateSubgroup,
)
router.delete('/:id', validateRequest(masterIdSchema, 'params'), deleteSubgroup)

export default router
