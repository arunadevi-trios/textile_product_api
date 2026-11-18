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
import { masterListSchema } from '../../schemas/master/common.schema.js'
import {
  brandCreateSchema,
  brandIdSchema,
  brandUpdatePayloadSchema,
} from '../../schemas/master/brand.schema.js'

const router = Router()

router.use(masterResponse, requireAuth)

router.post('/getBrandList', validateRequest(masterListSchema), listBrands)
router.post('/setBrand', validateRequest(brandCreateSchema), createBrand)
router.post('/getBrandDetails', validateRequest(brandIdSchema), getBrand)
router.post('/updateBrand', validateRequest(brandUpdatePayloadSchema), updateBrand)
router.post('/deleteBrand', validateRequest(brandIdSchema), deleteBrand)

export default router
