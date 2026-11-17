import { Router } from 'express'
import {
  createGroup,
  deleteGroup,
  getGroup,
  listGroups,
  updateGroup,
} from '../../controllers/master/group.controller.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { validateRequest } from '../../middleware/validate-request.js'
import {
  groupMasterIdSchema,
  masterIdSchema,
  masterListSchema,
} from '../../schemas/master/common.schema.js'
import {
  groupCreateSchema,
  groupUpdatePayloadSchema,
  groupUpdateSchema,
} from '../../schemas/master/group.schema.js'

const router = Router()

router.use(requireAuth)

router.get('/', validateRequest(masterListSchema, 'query'), listGroups)
router.post('/', validateRequest(groupCreateSchema), createGroup)
router.get('/:id', validateRequest(masterIdSchema, 'params'), getGroup)
router.put(
  '/:id',
  validateRequest(masterIdSchema, 'params'),
  validateRequest(groupUpdateSchema),
  updateGroup,
)
router.delete('/:id', validateRequest(masterIdSchema, 'params'), deleteGroup)

router.post('/getMasterList', validateRequest(masterListSchema), listGroups)
router.post('/setMaster', validateRequest(groupCreateSchema), createGroup)
router.post('/getMasterDetails', validateRequest(groupMasterIdSchema), getGroup)
router.post('/updateMaster', validateRequest(groupUpdatePayloadSchema), updateGroup)
router.post('/deleteMaster', validateRequest(groupMasterIdSchema), deleteGroup)

export default router
