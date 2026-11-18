/** Tax service */
import { errorlog } from '../errorLogService.js';
import { COMMON, ERROR_LOG_MESSAGE } from '../../constants/index.js';
import { validateToken, getStatusCondition, getPagination, logUserAction } from '../common.js';
import { pool } from '../../config/database.js';

/** Get tax list */
export async function listTaxes(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const { page = 1, limit = 20, status = 'active', search } = req.body;
    const tenantId = varDecoded.tenantId;
    const filters = ['t.tx_tenant_id = $1', 't.tx_delflag = 0', getStatusCondition(status, 't.tx_status')];
    const values = [tenantId];
    if (search) {
      values.push(`%${search}%`);
      filters.push(`t.tx_percentage::TEXT ILIKE $${values.length}`);
    }
    const where = filters.join(' AND ');
    const { offset } = getPagination(page, limit);

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total FROM mr_tax t WHERE ${where}`, values
    );
    const listResult = await pool.query(
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
      [...values, limit, offset]
    );

    if (listResult.rowCount > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: { tax_list: listResult.rows, total: countResult.rows[0].total, page, limit } };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: { tax_list: [] } };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'tax', error, 'listTaxes');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Get tax details */
export async function getTax(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const taxId = req.body.taxId ?? req.params?.id;
    const tenantId = varDecoded.tenantId;

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
      [tenantId, taxId]
    );

    if (rows.length > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: rows[0] };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: {} };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'tax', error, 'getTax');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Create tax */
export async function createTax(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { taxPercentage } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO mr_tax (tx_tenant_id, tx_percentage, tx_maker_id)
         VALUES ($1, $2, $3)
         RETURNING tx_id AS "taxId"`,
        [tenantId, taxPercentage, userId]
      );
      const taxId = rows[0].taxId;
      await logUserAction(client, tenantId, userId, `CREATE_TAX: id=${taxId}, percentage=${taxPercentage}`);
      await client.query('COMMIT');
      return { ...COMMON.SAVE_RESPONSE, data: { taxId, taxPercentage } };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        return COMMON.DUPLICATE_TAX_RESPONSE;
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'tax', error, 'createTax');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Update tax */
export async function updateTax(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { taxId, taxPercentage, statusId } = req.body;
    const id = taxId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE mr_tax
            SET tx_percentage = $3, tx_status = COALESCE($4, tx_status), tx_modified = NOW()
          WHERE tx_tenant_id = $1 AND tx_id = $2 AND tx_delflag = 0
          RETURNING tx_id AS "taxId"`,
        [tenantId, id, taxPercentage, statusId ?? null]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return { ...COMMON.NORECORD_RESPONSE, data: {} };
      }
      await logUserAction(client, tenantId, userId, `UPDATE_TAX: id=${id}`);
      await client.query('COMMIT');
      return { ...COMMON.UPDATE_RESPONSE, data: { taxId: id, taxPercentage } };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        return COMMON.DUPLICATE_TAX_RESPONSE;
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'tax', error, 'updateTax');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Delete tax */
export async function deleteTax(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const taxId = req.body.taxId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `UPDATE mr_tax
            SET tx_delflag = 1, tx_modified = NOW()
          WHERE tx_tenant_id = $1 AND tx_id = $2 AND tx_delflag = 0`,
        [tenantId, taxId]
      );
      if (rowCount > 0) {
        await logUserAction(client, tenantId, userId, `DELETE_TAX: id=${taxId}`);
        await client.query('COMMIT');
        return { ...COMMON.DELETE_RESPONSE, data: {} };
      }
      await client.query('ROLLBACK');
      return { ...COMMON.NORECORD_RESPONSE, data: {} };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'tax', error, 'deleteTax');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}
