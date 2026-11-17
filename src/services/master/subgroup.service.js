import { pool } from '../../config/database.js'
import {
  formatPage,
  getPagination,
  getStatusCondition,
  logUserAction,
} from './common.js'

export async function listSubgroups(tenantId, { page, limit, status, search, groupId }) {
  const filters = [
    's.sg_tenant_id = $1',
    's.sg_delflag = 0',
    'g.gr_delflag = 0',
    getStatusCondition(status, 's.sg_status'),
  ]
  const values = [tenantId]
  if (groupId !== undefined) {
    values.push(groupId)
    filters.push(`s.sg_gr_id = $${values.length}`)
  }
  if (search) {
    values.push(`%${search}%`)
    filters.push(`(s.sg_name ILIKE $${values.length} OR g.gr_name ILIKE $${values.length})`)
  }
  const where = filters.join(' AND ')
  const { offset } = getPagination(page, limit)

  const [countResult, listResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::INTEGER AS total
         FROM mr_subgroup s
         JOIN mr_group g
           ON g.gr_tenant_id = s.sg_tenant_id AND g.gr_id = s.sg_gr_id
          AND g.gr_delflag = 0
        WHERE ${where}`,
      values,
    ),
    pool.query(
      `SELECT s.sg_id AS "subgroupId",
              s.sg_name AS "subgroupName",
              s.sg_maker_id AS "makerId",
              s.sg_gr_id AS "groupId",
              g.gr_name AS "groupName",
              s.sg_status AS "statusId",
              s.sg_delflag AS "recordFlag",
              s.sg_created AS "createdAt",
              s.sg_modified AS "updatedAt"
         FROM mr_subgroup s
         JOIN mr_group g
           ON g.gr_tenant_id = s.sg_tenant_id AND g.gr_id = s.sg_gr_id
          AND g.gr_delflag = 0
        WHERE ${where}
        ORDER BY g.gr_name, s.sg_name, s.sg_id
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    ),
  ])
  return formatPage(listResult.rows, countResult.rows[0].total, page, limit)
}

export async function getSubgroup(tenantId, subgroupId) {
  const { rows } = await pool.query(
    `SELECT s.sg_id AS "subgroupId",
            s.sg_name AS "subgroupName",
            s.sg_maker_id AS "makerId",
            s.sg_gr_id AS "groupId",
            g.gr_name AS "groupName",
            s.sg_status AS "statusId",
            s.sg_delflag AS "recordFlag",
            s.sg_created AS "createdAt",
            s.sg_modified AS "updatedAt"
       FROM mr_subgroup s
       JOIN mr_group g
         ON g.gr_tenant_id = s.sg_tenant_id AND g.gr_id = s.sg_gr_id
        AND g.gr_delflag = 0
      WHERE s.sg_tenant_id = $1 AND s.sg_id = $2 AND s.sg_delflag = 0`,
    [tenantId, subgroupId],
  )
  return rows[0] ?? null
}

export async function createSubgroup(tenantId, userId, { groupId, subgroupName }) {
  const client = await pool.connect()
  let subgroupId
  try {
    await client.query('BEGIN')
    const group = await client.query(
      `SELECT gr_id
         FROM mr_group
        WHERE gr_tenant_id = $1 AND gr_id = $2
          AND gr_status = 1 AND gr_delflag = 0
        FOR UPDATE`,
      [tenantId, groupId],
    )
    if (!group.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }
    const { rows } = await client.query(
      `INSERT INTO mr_subgroup (sg_tenant_id, sg_gr_id, sg_name, sg_maker_id)
       VALUES ($1, $2, $3, $4)
       RETURNING sg_id AS "subgroupId"`,
      [tenantId, groupId, subgroupName, userId],
    )
    subgroupId = rows[0].subgroupId
    await logUserAction(
      client,
      tenantId,
      userId,
      `CREATE_SUBGROUP: id=${subgroupId}, groupId=${groupId}, name=${subgroupName}`,
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getSubgroup(tenantId, subgroupId)
}

export async function updateSubgroup(
  tenantId,
  userId,
  subgroupId,
  { groupId, subgroupName, statusId },
) {
  const client = await pool.connect()
  let updatedSubgroupId
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE mr_subgroup s
          SET sg_gr_id = g.gr_id, sg_name = $4,
              sg_status = COALESCE($5, s.sg_status),
              sg_modified = NOW()
         FROM mr_group g
        WHERE s.sg_tenant_id = $1 AND s.sg_id = $2
          AND s.sg_delflag = 0
          AND g.gr_tenant_id = $1 AND g.gr_id = $3 AND g.gr_delflag = 0
          AND (g.gr_status = 1 OR COALESCE($5, s.sg_status) = 0)
        RETURNING s.sg_id AS "subgroupId"`,
      [tenantId, subgroupId, groupId, subgroupName, statusId ?? null],
    )
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return null
    }
    updatedSubgroupId = rows[0].subgroupId
    await logUserAction(client, tenantId, userId, `UPDATE_SUBGROUP: id=${updatedSubgroupId}`)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getSubgroup(tenantId, updatedSubgroupId)
}

export async function deleteSubgroup(tenantId, userId, subgroupId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rowCount } = await client.query(
      `UPDATE mr_subgroup
          SET sg_delflag = 1, sg_modified = NOW()
        WHERE sg_tenant_id = $1 AND sg_id = $2 AND sg_delflag = 0`,
      [tenantId, subgroupId],
    )
    if (rowCount > 0) {
      await logUserAction(client, tenantId, userId, `DELETE_SUBGROUP: id=${subgroupId}`)
    }
    await client.query('COMMIT')
    return rowCount > 0
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
