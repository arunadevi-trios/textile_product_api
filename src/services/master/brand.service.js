import { pool } from '../../config/database.js'
import {
  formatPage,
  getPagination,
  getStatusCondition,
  logUserAction,
} from './common.js'

export async function listBrands(tenantId, { page, limit, status, search }) {
  const filters = [
    'b.br_tenant_id = $1',
    'b.br_delflag = 0',
    getStatusCondition(status, 'b.br_status'),
  ]
  const values = [tenantId]
  if (search) {
    values.push(`%${search}%`)
    filters.push(`b.br_name ILIKE $${values.length}`)
  }
  const where = filters.join(' AND ')
  const { offset } = getPagination(page, limit)
  const [countResult, listResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::INTEGER AS total FROM mr_brand b WHERE ${where}`, values),
    pool.query(
      `SELECT b.br_id AS "brandId",
              b.br_name AS "brandName",
              b.br_maker_id AS "makerId",
              b.br_status AS "statusId",
              b.br_delflag AS "recordFlag",
              b.br_created AS "createdAt",
              b.br_modified AS "updatedAt"
         FROM mr_brand b
        WHERE ${where}
        ORDER BY b.br_id
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    ),
  ])
  return formatPage(listResult.rows, countResult.rows[0].total, page, limit)
}

export async function getBrand(tenantId, brandId) {
  const { rows } = await pool.query(
    `SELECT br_id AS "brandId",
            br_name AS "brandName",
            br_maker_id AS "makerId",
            br_status AS "statusId",
            br_delflag AS "recordFlag",
            br_created AS "createdAt",
            br_modified AS "updatedAt"
       FROM mr_brand
      WHERE br_tenant_id = $1 AND br_id = $2 AND br_delflag = 0`,
    [tenantId, brandId],
  )
  return rows[0] ?? null
}

export async function createBrand(tenantId, userId, brandName) {
  const client = await pool.connect()
  let brandId
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO mr_brand (br_tenant_id, br_name, br_maker_id)
       VALUES ($1, $2, $3)
       RETURNING br_id AS "brandId"`,
      [tenantId, brandName, userId],
    )
    brandId = rows[0].brandId
    await logUserAction(client, tenantId, userId, `CREATE_BRAND: id=${brandId}, name=${brandName}`)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getBrand(tenantId, brandId)
}

export async function updateBrand(tenantId, userId, brandId, { brandName, statusId }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE mr_brand
          SET br_name = $3, br_status = COALESCE($4, br_status), br_modified = NOW()
        WHERE br_tenant_id = $1 AND br_id = $2 AND br_delflag = 0
        RETURNING br_id AS "brandId"`,
      [tenantId, brandId, brandName, statusId ?? null],
    )
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return null
    }
    await logUserAction(client, tenantId, userId, `UPDATE_BRAND: id=${brandId}`)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getBrand(tenantId, brandId)
}

export async function deleteBrand(tenantId, userId, brandId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rowCount } = await client.query(
      `UPDATE mr_brand
          SET br_delflag = 1, br_modified = NOW()
        WHERE br_tenant_id = $1 AND br_id = $2 AND br_delflag = 0`,
      [tenantId, brandId],
    )
    if (rowCount > 0) {
      await logUserAction(client, tenantId, userId, `DELETE_BRAND: id=${brandId}`)
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
