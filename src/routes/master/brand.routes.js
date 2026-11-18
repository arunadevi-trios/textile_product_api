import { Router } from 'express'
import {
  createBrand,
  deleteBrand,
  getBrand,
  listBrands,
  updateBrand,
} from '../../controllers/master/brand.controller.js'
import { requireAuth } from '../../middleware/require-auth.js'
import { masterResponse } from '../../middleware/master-response.js'
import { validateRequest } from '../../middleware/validate-request.js'
import { masterIdSchema, masterListSchema } from '../../schemas/master/common.schema.js'
import {
  brandCreateSchema,
  brandIdSchema,
  brandUpdatePayloadSchema,
  brandUpdateSchema,
} from '../../schemas/master/brand.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

router.get('/', validateRequest(masterListSchema, 'query'), listBrands)
router.post('/', validateRequest(brandCreateSchema), createBrand)
router.get('/:id', validateRequest(masterIdSchema, 'params'), getBrand)
router.put(
  '/:id',
  validateRequest(masterIdSchema, 'params'),
  validateRequest(brandUpdateSchema),
  updateBrand,
)
router.delete('/:id', validateRequest(masterIdSchema, 'params'), deleteBrand)

router.post('/getMasterList', validateRequest(masterListSchema), listBrands)
router.post('/setMaster', validateRequest(brandCreateSchema), createBrand)
router.post('/getMasterDetails', validateRequest(brandIdSchema), getBrand)
router.post('/updateMaster', validateRequest(brandUpdatePayloadSchema), updateBrand)
router.post('/deleteMaster', validateRequest(brandIdSchema), deleteBrand)

export default router
