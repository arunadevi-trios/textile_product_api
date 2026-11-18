/** Brand service */
import { errorlog } from '../errorLogService.js';
import { COMMON, ERROR_LOG_MESSAGE } from '../../constants/index.js';
import { validateToken, getStatusCondition, getPagination, logUserAction } from '../common.js';
import { pool } from '../../config/database.js';

/** Get brand list */
export async function listBrands(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const { page = 1, limit = 20, status = 'active', search } = req.body;
    const tenantId = varDecoded.tenantId;
    const filters = ['b.br_tenant_id = $1', 'b.br_delflag = 0', getStatusCondition(status, 'b.br_status')];
    const values = [tenantId];
    if (search) {
      values.push(`%${search}%`);
      filters.push(`b.br_name ILIKE $${values.length}`);
    }
    const where = filters.join(' AND ');
    const { offset } = getPagination(page, limit);

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total FROM mr_brand b WHERE ${where}`, values
    );
    const listResult = await pool.query(
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
      [...values, limit, offset]
    );

    if (listResult.rowCount > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: { brand_list: listResult.rows, total: countResult.rows[0].total, page, limit } };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: { brand_list: [] } };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'brand', error, 'listBrands');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Get brand details */
export async function getBrand(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const brandId = req.body.brandId ?? req.params?.id;
    const tenantId = varDecoded.tenantId;

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
      [tenantId, brandId]
    );

    if (rows.length > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: rows[0] };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: {} };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'brand', error, 'getBrand');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Create brand */
export async function createBrand(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { brandName } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO mr_brand (br_tenant_id, br_name, br_maker_id)
         VALUES ($1, $2, $3)
         RETURNING br_id AS "brandId"`,
        [tenantId, brandName, userId]
      );
      const brandId = rows[0].brandId;
      await logUserAction(client, tenantId, userId, `CREATE_BRAND: id=${brandId}, name=${brandName}`);
      await client.query('COMMIT');
      return { ...COMMON.SAVE_RESPONSE, data: { brandId, brandName } };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        return COMMON.DUPLICATE_NAME_RESPONSE;
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'brand', error, 'createBrand');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Update brand */
export async function updateBrand(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { brandId, brandName, statusId } = req.body;
    const id = brandId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE mr_brand
            SET br_name = $3, br_status = COALESCE($4, br_status), br_modified = NOW()
          WHERE br_tenant_id = $1 AND br_id = $2 AND br_delflag = 0
          RETURNING br_id AS "brandId"`,
        [tenantId, id, brandName, statusId ?? null]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return { ...COMMON.NORECORD_RESPONSE, data: {} };
      }
      await logUserAction(client, tenantId, userId, `UPDATE_BRAND: id=${id}`);
      await client.query('COMMIT');
      return { ...COMMON.UPDATE_RESPONSE, data: { brandId: id, brandName } };
    } catch (error) {
      await client.query('ROLLBACK');
      if (error.code === '23505') {
        return COMMON.DUPLICATE_NAME_RESPONSE;
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'brand', error, 'updateBrand');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Delete brand */
export async function deleteBrand(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const brandId = req.body.brandId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `UPDATE mr_brand
            SET br_delflag = 1, br_modified = NOW()
          WHERE br_tenant_id = $1 AND br_id = $2 AND br_delflag = 0`,
        [tenantId, brandId]
      );
      if (rowCount > 0) {
        await logUserAction(client, tenantId, userId, `DELETE_BRAND: id=${brandId}`);
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'brand', error, 'deleteBrand');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}
