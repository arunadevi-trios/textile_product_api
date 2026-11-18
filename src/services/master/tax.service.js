import { pool } from '../../config/database.js'
import {
  formatPage,
  getPagination,
  getStatusCondition,
  logUserAction,
} from './common.js'

export async function listTaxes(tenantId, { page, limit, status, search }) {
  const filters = [
    't.tx_tenant_id = $1',
    't.tx_delflag = 0',
    getStatusCondition(status, 't.tx_status'),
  ]
  const values = [tenantId]
  if (search) {
    values.push(`%${search}%`)
    filters.push(`t.tx_percentage::TEXT ILIKE $${values.length}`)
  }
  const where = filters.join(' AND ')
  const { offset } = getPagination(page, limit)
  const [countResult, listResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::INTEGER AS total FROM mr_tax t WHERE ${where}`, values),
    pool.query(
      `SELECT t.tx_id AS "taxId",
              t.tx_percentage AS "taxPercentage",
              t.tx_maker_id AS "makerId",
              t.tx_status AS "statusId",
              t.tx_delflag AS "recordFlag",
              t.tx_created AS "createdAt",
              t.tx_modified AS "updatedAt"
         FROM mr_tax t
        WHERE ${where}
        ORDER BY t.tx_id
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    ),
  ])
  return formatPage(listResult.rows, countResult.rows[0].total, page, limit)
}

export async function getTax(tenantId, taxId) {
  const { rows } = await pool.query(
    `SELECT tx_id AS "taxId",
            tx_percentage AS "taxPercentage",
            tx_maker_id AS "makerId",
            tx_status AS "statusId",
            tx_delflag AS "recordFlag",
            tx_created AS "createdAt",
            tx_modified AS "updatedAt"
       FROM mr_tax
      WHERE tx_tenant_id = $1 AND tx_id = $2 AND tx_delflag = 0`,
    [tenantId, taxId],
  )
  return rows[0] ?? null
}

export async function createTax(tenantId, userId, taxPercentage) {
  const client = await pool.connect()
  let taxId
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO mr_tax (tx_tenant_id, tx_percentage, tx_maker_id)
       VALUES ($1, $2, $3)
       RETURNING tx_id AS "taxId"`,
      [tenantId, taxPercentage, userId],
    )
    taxId = rows[0].taxId
    await logUserAction(client, tenantId, userId, `CREATE_TAX: id=${taxId}, percentage=${taxPercentage}`)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getTax(tenantId, taxId)
}

export async function updateTax(tenantId, userId, taxId, { taxPercentage, statusId }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE mr_tax
          SET tx_percentage = $3, tx_status = COALESCE($4, tx_status), tx_modified = NOW()
        WHERE tx_tenant_id = $1 AND tx_id = $2 AND tx_delflag = 0
        RETURNING tx_id AS "taxId"`,
      [tenantId, taxId, taxPercentage, statusId ?? null],
    )
    if (!rows[0]) {
      await client.query('ROLLBACK')
      return null
    }
    await logUserAction(client, tenantId, userId, `UPDATE_TAX: id=${taxId}`)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return getTax(tenantId, taxId)
}

export async function deleteTax(tenantId, userId, taxId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rowCount } = await client.query(
      `UPDATE mr_tax
          SET tx_delflag = 1, tx_modified = NOW()
        WHERE tx_tenant_id = $1 AND tx_id = $2 AND tx_delflag = 0`,
      [tenantId, taxId],
    )
    if (rowCount > 0) {
      await logUserAction(client, tenantId, userId, `DELETE_TAX: id=${taxId}`)
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
