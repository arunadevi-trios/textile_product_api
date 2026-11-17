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
import { masterIdSchema, masterListSchema } from '../../schemas/master/common.schema.js'
import { groupCreateSchema, groupUpdateSchema } from '../../schemas/master/group.schema.js'

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

export default router
