import { Router } from 'express'
import {
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  updateGroup,
} from '../../controllers/master/group.controller.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { masterResponse } from '../../middleware/master-response.js'
import { validateRequest } from '../../middleware/validate-request.js'
import {
  groupMasterIdSchema,
  masterListSchema,
} from '../../schemas/master/common.schema.js'
import {
  groupCreateSchema,
  groupUpdatePayloadSchema,
} from '../../schemas/master/group.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

router.post('/getGroupList', validateRequest(masterListSchema), listGroups)
router.post('/setGroup', validateRequest(groupCreateSchema), createGroup)
router.post('/getGroupDetails', validateRequest(groupMasterIdSchema), getGroup)
router.post('/updateGroup', validateRequest(groupUpdatePayloadSchema), updateGroup)
router.post('/deleteGroup', validateRequest(groupMasterIdSchema), deleteGroup)

export default router
