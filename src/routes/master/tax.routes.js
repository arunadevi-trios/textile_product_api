import { Router } from 'express'
import {
  createTax,
  deleteTax,
  getTax,
  listTaxes,
  updateTax,
} from '../../controllers/master/tax.controller.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { masterResponse } from '../../middleware/master-response.js'
import { validateRequest } from '../../middleware/validate-request.js'
import { masterIdSchema, masterListSchema } from '../../schemas/master/common.schema.js'
import {
  taxCreateSchema,
  taxIdSchema,
  taxUpdatePayloadSchema,
  taxUpdateSchema,
} from '../../schemas/master/tax.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

router.get('/', validateRequest(masterListSchema, 'query'), listTaxes)
router.post('/', validateRequest(taxCreateSchema), createTax)
router.get('/:id', validateRequest(masterIdSchema, 'params'), getTax)
router.put(
  '/:id',
  validateRequest(masterIdSchema, 'params'),
  validateRequest(taxUpdateSchema),
  updateTax,
)
router.delete('/:id', validateRequest(masterIdSchema, 'params'), deleteTax)

router.post('/getMasterList', validateRequest(masterListSchema), listTaxes)
router.post('/setMaster', validateRequest(taxCreateSchema), createTax)
router.post('/getMasterDetails', validateRequest(taxIdSchema), getTax)
router.post('/updateMaster', validateRequest(taxUpdatePayloadSchema), updateTax)
router.post('/deleteMaster', validateRequest(taxIdSchema), deleteTax)

export default router
