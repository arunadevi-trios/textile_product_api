import * as subgroupService from '../../services/master/subgroup.service.js'
import { normalizeTenantId } from '../../utils/tenant-id.js'

function getTenantId(req, res) {
  const tenantId = normalizeTenantId(req.auth.tenantId)
  if (tenantId !== null) return tenantId
  res.status(403).json({
    error: { code: 'TENANT_REQUIRED', message: 'The authenticated account has no valid tenant.' },
  })
  return null
}

function getUserId(req, res) {
  const userId = normalizeTenantId(req.auth.sub)
  if (userId !== null) return userId
  res.status(403).json({
    error: { code: 'USER_REQUIRED', message: 'The authenticated account has no valid user ID.' },
  })
  return null
}

function notFound(res, resource) {
  return res.status(404).json({
    error: { code: 'NOT_FOUND', message: `${resource} was not found.` },
  })
}

export async function listSubgroups(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    return res.status(200).json(
      await subgroupService.listSubgroups(tenantId, req.validatedBody ?? req.validatedQuery),
    )
  } catch (error) {
    return next(error)
  }
}

export async function getSubgroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const subgroupId = req.validatedBody?.subgroupId ?? req.validatedParams.id
    const subgroup = await subgroupService.getSubgroup(tenantId, subgroupId)
    return subgroup ? res.status(200).json(subgroup) : notFound(res, 'Subgroup')
  } catch (error) {
    return next(error)
  }
}

export async function createSubgroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const userId = getUserId(req, res)
    if (userId === null) return
    const subgroup = await subgroupService.createSubgroup(
      tenantId,
      userId,
      req.validatedBody,
    )
    return subgroup
      ? res.status(201).json(subgroup)
      : res.status(400).json({
          error: { code: 'INVALID_GROUP', message: 'The selected active group was not found.' },
        })
  } catch (error) {
    return next(error)
  }
}

export async function updateSubgroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const userId = getUserId(req, res)
    if (userId === null) return
    const subgroup = await subgroupService.updateSubgroup(
      tenantId,
      userId,
      req.validatedBody.subgroupId ?? req.validatedParams.id,
      req.validatedBody,
    )
    return subgroup ? res.status(200).json(subgroup) : notFound(res, 'Subgroup or active group')
  } catch (error) {
    return next(error)
  }
}

export async function deleteSubgroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const userId = getUserId(req, res)
    if (userId === null) return
    const deleted = await subgroupService.deleteSubgroup(
      tenantId,
      userId,
      req.validatedBody?.subgroupId ?? req.validatedParams.id,
    )
    return deleted ? res.status(200).json(null) : notFound(res, 'Subgroup')
  } catch (error) {
    return next(error)
  }
}
