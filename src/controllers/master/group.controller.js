import * as groupService from '../../services/master/group.service.js'
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

function notFound(res) {
  return res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Group was not found.' },
  })
}

export async function listGroups(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    return res.status(200).json(await groupService.listGroups(tenantId, req.validatedQuery))
  } catch (error) {
    return next(error)
  }
}

export async function getGroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const group = await groupService.getGroup(tenantId, req.validatedParams.id)
    return group ? res.status(200).json(group) : notFound(res)
  } catch (error) {
    return next(error)
  }
}

export async function createGroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const userId = getUserId(req, res)
    if (userId === null) return
    return res.status(201).json(
      await groupService.createGroup(tenantId, userId, req.validatedBody.groupName),
    )
  } catch (error) {
    return next(error)
  }
}

export async function updateGroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const userId = getUserId(req, res)
    if (userId === null) return
    const group = await groupService.updateGroup(
      tenantId,
      userId,
      req.validatedParams.id,
      req.validatedBody,
    )
    return group ? res.status(200).json(group) : notFound(res)
  } catch (error) {
    return next(error)
  }
}

export async function deleteGroup(req, res, next) {
  try {
    const tenantId = getTenantId(req, res)
    if (tenantId === null) return
    const userId = getUserId(req, res)
    if (userId === null) return
    const deleted = await groupService.deleteGroup(tenantId, userId, req.validatedParams.id)
    return deleted ? res.status(204).end() : notFound(res)
  } catch (error) {
    return next(error)
  }
}
