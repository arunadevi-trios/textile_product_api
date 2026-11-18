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
import { masterListSchema } from '../../schemas/master/common.schema.js'
import {
  taxCreateSchema,
  taxIdSchema,
  taxUpdatePayloadSchema,
} from '../../schemas/master/tax.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

router.post('/getTaxList', validateRequest(masterListSchema), listTaxes)
router.post('/setTax', validateRequest(taxCreateSchema), createTax)
router.post('/getTaxDetails', validateRequest(taxIdSchema), getTax)
router.post('/updateTax', validateRequest(taxUpdatePayloadSchema), updateTax)
router.post('/deleteTax', validateRequest(taxIdSchema), deleteTax)

export default router
