import * as brandService from '../../services/master/brand.service.js'
import { normalizeTenantId } from '../../utils/tenant-id.js'

function getIdentity(req, res) {
  const tenantId = normalizeTenantId(req.auth.tenantId)
  if (tenantId === null) {
    res.status(403).json({
      error: { code: 'TENANT_REQUIRED', message: 'The authenticated account has no valid tenant.' },
    })
    return null
  }
  const userId = normalizeTenantId(req.auth.sub)
  if (userId === null) {
    res.status(403).json({
      error: { code: 'USER_REQUIRED', message: 'The authenticated account has no valid user ID.' },
    })
    return null
  }
  return { tenantId, userId }
}

function notFound(res) {
  return res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Brand was not found.' },
  })
}

export async function listBrands(req, res, next) {
  try {
    const tenantId = normalizeTenantId(req.auth.tenantId)
    if (tenantId === null) {
      return res.status(403).json({
        error: { code: 'TENANT_REQUIRED', message: 'The authenticated account has no valid tenant.' },
      })
    }
    return res.status(200).json(
      await brandService.listBrands(tenantId, req.validatedBody ?? req.validatedQuery),
    )
  } catch (error) {
    return next(error)
  }
}

export async function getBrand(req, res, next) {
  try {
    const tenantId = normalizeTenantId(req.auth.tenantId)
    if (tenantId === null) {
      return res.status(403).json({
        error: { code: 'TENANT_REQUIRED', message: 'The authenticated account has no valid tenant.' },
      })
    }
    const brandId = req.validatedBody?.brandId ?? req.validatedParams.id
    const brand = await brandService.getBrand(tenantId, brandId)
    return brand ? res.status(200).json(brand) : notFound(res)
  } catch (error) {
    return next(error)
  }
}

export async function createBrand(req, res, next) {
  try {
    const identity = getIdentity(req, res)
    if (!identity) return
    return res.status(201).json(
      await brandService.createBrand(identity.tenantId, identity.userId, req.validatedBody.brandName),
    )
  } catch (error) {
    return next(error)
  }
}

export async function updateBrand(req, res, next) {
  try {
    const identity = getIdentity(req, res)
    if (!identity) return
    const brand = await brandService.updateBrand(
      identity.tenantId,
      identity.userId,
      req.validatedBody.brandId ?? req.validatedParams.id,
      req.validatedBody,
    )
    return brand ? res.status(200).json(brand) : notFound(res)
  } catch (error) {
    return next(error)
  }
}

export async function deleteBrand(req, res, next) {
  try {
    const identity = getIdentity(req, res)
    if (!identity) return
    const deleted = await brandService.deleteBrand(
      identity.tenantId,
      identity.userId,
      req.validatedBody?.brandId ?? req.validatedParams.id,
    )
    return deleted ? res.status(200).json(null) : notFound(res)
  } catch (error) {
    return next(error)
  }
}
