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
  masterListSchema,
  subgroupMasterIdSchema,
} from '../../schemas/master/common.schema.js'
import {
  subgroupCreateSchema,
  subgroupUpdatePayloadSchema,
} from '../../schemas/master/subgroup.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

router.post('/getSubgroupList', validateRequest(masterListSchema), listSubgroups)
router.post('/setSubgroup', validateRequest(subgroupCreateSchema), createSubgroup)
router.post('/getSubgroupDetails', validateRequest(subgroupMasterIdSchema), getSubgroup)
router.post('/updateSubgroup', validateRequest(subgroupUpdatePayloadSchema), updateSubgroup)
router.post('/deleteSubgroup', validateRequest(subgroupMasterIdSchema), deleteSubgroup)

export default router
