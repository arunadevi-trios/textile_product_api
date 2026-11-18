import * as taxService from '../../services/master/tax.service.js'
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
    error: { code: 'NOT_FOUND', message: 'Tax was not found.' },
  })
}

export async function listTaxes(req, res, next) {
  try {
    const tenantId = normalizeTenantId(req.auth.tenantId)
    if (tenantId === null) {
      return res.status(403).json({
        error: { code: 'TENANT_REQUIRED', message: 'The authenticated account has no valid tenant.' },
      })
    }
    return res.status(200).json(
      await taxService.listTaxes(tenantId, req.validatedBody ?? req.validatedQuery),
    )
  } catch (error) {
    return next(error)
  }
}

export async function getTax(req, res, next) {
  try {
    const tenantId = normalizeTenantId(req.auth.tenantId)
    if (tenantId === null) {
      return res.status(403).json({
        error: { code: 'TENANT_REQUIRED', message: 'The authenticated account has no valid tenant.' },
      })
    }
    const taxId = req.validatedBody?.taxId ?? req.validatedParams.id
    const tax = await taxService.getTax(tenantId, taxId)
    return tax ? res.status(200).json(tax) : notFound(res)
  } catch (error) {
    return next(error)
  }
}

export async function createTax(req, res, next) {
  try {
    const identity = getIdentity(req, res)
    if (!identity) return
    return res.status(201).json(
      await taxService.createTax(identity.tenantId, identity.userId, req.validatedBody.taxPercentage),
    )
  } catch (error) {
    return next(error)
  }
}

export async function updateTax(req, res, next) {
  try {
    const identity = getIdentity(req, res)
    if (!identity) return
    const tax = await taxService.updateTax(
      identity.tenantId,
      identity.userId,
      req.validatedBody.taxId ?? req.validatedParams.id,
      req.validatedBody,
    )
    return tax ? res.status(200).json(tax) : notFound(res)
  } catch (error) {
    return next(error)
  }
}

export async function deleteTax(req, res, next) {
  try {
    const identity = getIdentity(req, res)
    if (!identity) return
    const deleted = await taxService.deleteTax(
      identity.tenantId,
      identity.userId,
      req.validatedBody?.taxId ?? req.validatedParams.id,
    )
    return deleted ? res.status(200).json(null) : notFound(res)
  } catch (error) {
    return next(error)
  }
}
