import { pool } from '../../config/database.js'
import {
  formatPage,
  getPagination,
  getStatusCondition,
  logUserAction,
} from './common.js'

function groupHasSubgroupsError() {
  const error = new Error('Groups with subgroups cannot be deactivated or deleted.')
  error.code = 'GROUP_HAS_SUBGROUPS'
  return error
}

export async function listGroups(tenantId, { page, limit, status, search }) {
  const filters = [
    'g.gr_tenant_id = $1',
    'g.gr_delflag = 1',
    getStatusCondition(status, 'g.gr_status'),
  ]
  const values = [tenantId]
  if (search) {
    values.push(`%${search}%`)
    filters.push(`g.gr_name ILIKE $${values.length}`)
  }
  const where = filters.join(' AND ')
  const { offset } = getPagination(page, limit)

  const [countResult, listResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::INTEGER AS total FROM mr_group g WHERE ${where}`, values),
    pool.query(
      `SELECT g.gr_id AS "groupId",
              g.gr_name AS "groupName",
              g.gr_maker_id AS "makerId",
              g.gr_status AS "statusId",
              g.gr_delflag AS "recordFlag",
              g.gr_created AS "createdAt",
              g.gr_modified AS "updatedAt",
              COUNT(s.sg_id)::INTEGER AS "subgroupCount"
         FROM mr_group g
         LEFT JOIN mr_subgroup s
           ON s.sg_tenant_id = g.gr_tenant_id AND s.sg_gr_id = g.gr_id
          AND s.sg_delflag = 1
        WHERE ${where}
        GROUP BY g.gr_id
        ORDER BY g.gr_name, g.gr_id
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    ),
  ])
  return formatPage(listResult.rows, countResult.rows[0].total, page, limit)
}

export async function getGroup(tenantId, groupId) {
  const { rows } = await pool.query(
    `SELECT g.gr_id AS "groupId",
            g.gr_name AS "groupName",
            g.gr_maker_id AS "makerId",
            g.gr_status AS "statusId",
            g.gr_delflag AS "recordFlag",
            g.gr_created AS "createdAt",
            g.gr_modified AS "updatedAt",
            COUNT(s.sg_id)::INTEGER AS "subgroupCount"
       FROM mr_group g
       LEFT JOIN mr_subgroup s
         ON s.sg_tenant_id = g.gr_tenant_id AND s.sg_gr_id = g.gr_id
        AND s.sg_delflag = 1
      WHERE g.gr_tenant_id = $1 AND g.gr_id = $2 AND g.gr_delflag = 1
      GROUP BY g.gr_id`,
    [tenantId, groupId],
  )
  return rows[0] ?? null
}

export async function createGroup(tenantId, userId, groupName) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO mr_group (gr_tenant_id, gr_name, gr_maker_id)
       VALUES ($1, $2, $3)
       RETURNING gr_id AS "groupId", gr_name AS "groupName", gr_maker_id AS "makerId",
                 gr_status AS "statusId", gr_delflag AS "recordFlag",
                 gr_created AS "createdAt", gr_modified AS "updatedAt"`,
      [tenantId, groupName, userId],
    )
    await logUserAction(
      client,
      tenantId,
      userId,
      `CREATE_GROUP: id=${rows[0].groupId}, name=${groupName}`,
    )
    await client.query('COMMIT')
    return { ...rows[0], subgroupCount: 0 }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateGroup(tenantId, userId, groupId, { groupName, statusId }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const currentGroup = await client.query(
      `SELECT gr_id AS "groupId", gr_status AS "statusId"
         FROM mr_group
        WHERE gr_tenant_id = $1 AND gr_id = $2 AND gr_delflag = 1
        FOR UPDATE`,
      [tenantId, groupId],
    )
    if (!currentGroup.rows[0]) {
      await client.query('ROLLBACK')
      return null
    }
    if (statusId === 0) {
      const { rows } = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM mr_subgroup
            WHERE sg_tenant_id = $1 AND sg_gr_id = $2 AND sg_delflag = 1
         ) AS "hasSubgroups"`,
        [tenantId, groupId],
      )
      if (rows[0].hasSubgroups) throw groupHasSubgroupsError()
    }
    const { rows } = await client.query(
      `UPDATE mr_group
          SET gr_name = $3, gr_status = COALESCE($4, gr_status),
              gr_modified = NOW()
        WHERE gr_tenant_id = $1 AND gr_id = $2
        RETURNING gr_id AS "groupId", gr_name AS "groupName", gr_maker_id AS "makerId",
                  gr_status AS "statusId", gr_delflag AS "recordFlag",
                  gr_created AS "createdAt", gr_modified AS "updatedAt"`,
      [tenantId, groupId, groupName, statusId ?? null],
    )
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return null
    }
    const count = await client.query(
      `SELECT COUNT(*)::INTEGER AS "subgroupCount"
         FROM mr_subgroup
        WHERE sg_tenant_id = $1 AND sg_gr_id = $2 AND sg_delflag = 1`,
      [tenantId, groupId],
    )
    await logUserAction(client, tenantId, userId, `UPDATE_GROUP: id=${groupId}`)
    await client.query('COMMIT')
    return { ...rows[0], subgroupCount: count.rows[0].subgroupCount }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteGroup(tenantId, userId, groupId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const group = await client.query(
      `SELECT gr_id
         FROM mr_group
        WHERE gr_tenant_id = $1 AND gr_id = $2 AND gr_delflag = 1
        FOR UPDATE`,
      [tenantId, groupId],
    )
    if (!group.rows[0]) {
      await client.query('ROLLBACK')
      return false
    }
    const { rows } = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM mr_subgroup
          WHERE sg_tenant_id = $1 AND sg_gr_id = $2 AND sg_delflag = 1
       ) AS "hasSubgroups"`,
      [tenantId, groupId],
    )
    if (rows[0].hasSubgroups) throw groupHasSubgroupsError()
    const result = await client.query(
      `UPDATE mr_group
          SET gr_delflag = 0, gr_modified = NOW()
        WHERE gr_tenant_id = $1 AND gr_id = $2 AND gr_delflag = 1`,
      [tenantId, groupId],
    )
    if (result.rowCount > 0) {
      await logUserAction(client, tenantId, userId, `DELETE_GROUP: id=${groupId}`)
    }
    await client.query('COMMIT')
    return result.rowCount > 0
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
