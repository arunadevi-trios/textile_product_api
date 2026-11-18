import { Router } from 'express'
import {
  createSubgroup,
  deleteSubgroup,
  getSubgroup,
  listSubgroups,
  updateSubgroup,
} from '../../controllers/master/subgroup.controller.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { masterResponse } from '../../middleware/master-response.js'
import { validateRequest } from '../../middleware/validate-request.js'
import {
  masterIdSchema,
  masterListSchema,
  subgroupMasterIdSchema,
} from '../../schemas/master/common.schema.js'
import {
  subgroupCreateSchema,
  subgroupUpdatePayloadSchema,
  subgroupUpdateSchema,
} from '../../schemas/master/subgroup.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

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

router.post('/getMasterList', validateRequest(masterListSchema), listSubgroups)
router.post('/setMaster', validateRequest(subgroupCreateSchema), createSubgroup)
router.post('/getMasterDetails', validateRequest(subgroupMasterIdSchema), getSubgroup)
router.post('/updateMaster', validateRequest(subgroupUpdatePayloadSchema), updateSubgroup)
router.post('/deleteMaster', validateRequest(subgroupMasterIdSchema), deleteSubgroup)

export default router
