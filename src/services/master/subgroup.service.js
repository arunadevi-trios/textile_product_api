/** Subgroup service */
import { errorlog } from '../errorLogService.js';
import { COMMON, ERROR_LOG_MESSAGE } from '../../constants/index.js';
import { validateToken, getStatusCondition, getPagination, logUserAction } from '../common.js';
import { pool } from '../../config/database.js';

/** Get subgroup list */
export async function listSubgroups(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const { page = 1, limit = 20, status = 'active', search, groupId } = req.body;
    const tenantId = varDecoded.tenantId;
    const filters = ['s.sg_tenant_id = $1', 's.sg_delflag = 0', 'g.gr_delflag = 0', getStatusCondition(status, 's.sg_status')];
    const values = [tenantId];
    if (groupId !== undefined) {
      values.push(groupId);
      filters.push(`s.sg_gr_id = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      filters.push(`(s.sg_name ILIKE $${values.length} OR g.gr_name ILIKE $${values.length})`);
    }
    const where = filters.join(' AND ');
    const { offset } = getPagination(page, limit);

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
         FROM mr_subgroup s
         JOIN mr_group g ON g.gr_tenant_id = s.sg_tenant_id AND g.gr_id = s.sg_gr_id AND g.gr_delflag = 0
        WHERE ${where}`, values
    );
    const listResult = await pool.query(
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
         JOIN mr_group g ON g.gr_tenant_id = s.sg_tenant_id AND g.gr_id = s.sg_gr_id AND g.gr_delflag = 0
        WHERE ${where}
        ORDER BY g.gr_name, s.sg_name, s.sg_id
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    if (listResult.rowCount > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: { subgroup_list: listResult.rows, total: countResult.rows[0].total, page, limit } };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: { subgroup_list: [] } };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'subgroup', error, 'listSubgroups');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Get subgroup details */
export async function getSubgroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const subgroupId = req.body.subgroupId ?? req.params?.id;
    const tenantId = varDecoded.tenantId;

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
         JOIN mr_group g ON g.gr_tenant_id = s.sg_tenant_id AND g.gr_id = s.sg_gr_id AND g.gr_delflag = 0
        WHERE s.sg_tenant_id = $1 AND s.sg_id = $2 AND s.sg_delflag = 0`,
      [tenantId, subgroupId]
    );

    if (rows.length > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: rows[0] };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: {} };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'subgroup', error, 'getSubgroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Create subgroup */
export async function createSubgroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { groupId, subgroupName } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Verify group exists and is active
      const group = await client.query(
        `SELECT gr_id FROM mr_group WHERE gr_tenant_id = $1 AND gr_id = $2 AND gr_status = 1 AND gr_delflag = 0 FOR UPDATE`,
        [tenantId, groupId]
      );
      if (!group.rows[0]) {
        await client.query('ROLLBACK');
        return COMMON.INVALID_GROUP_RESPONSE;
      }
      const { rows } = await client.query(
        `INSERT INTO mr_subgroup (sg_tenant_id, sg_gr_id, sg_name, sg_maker_id)
         VALUES ($1, $2, $3, $4)
         RETURNING sg_id AS "subgroupId"`,
        [tenantId, groupId, subgroupName, userId]
      );
      const subgroupId = rows[0].subgroupId;
      await logUserAction(client, tenantId, userId, `CREATE_SUBGROUP: id=${subgroupId}, groupId=${groupId}, name=${subgroupName}`);
      await client.query('COMMIT');
      return { ...COMMON.SAVE_RESPONSE, data: { subgroupId, groupId, subgroupName } };
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'subgroup', error, 'createSubgroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Update subgroup */
export async function updateSubgroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { subgroupId, groupId, subgroupName, statusId } = req.body;
    const id = subgroupId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `UPDATE mr_subgroup s
            SET sg_gr_id = g.gr_id, sg_name = $4,
                sg_status = COALESCE($5, s.sg_status), sg_modified = NOW()
           FROM mr_group g
          WHERE s.sg_tenant_id = $1 AND s.sg_id = $2
            AND s.sg_delflag = 0
            AND g.gr_tenant_id = $1 AND g.gr_id = $3 AND g.gr_delflag = 0
            AND (g.gr_status = 1 OR COALESCE($5, s.sg_status) = 0)
          RETURNING s.sg_id AS "subgroupId"`,
        [tenantId, id, groupId, subgroupName, statusId ?? null]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return { ...COMMON.NORECORD_RESPONSE, data: {} };
      }
      await logUserAction(client, tenantId, userId, `UPDATE_SUBGROUP: id=${id}`);
      await client.query('COMMIT');
      return { ...COMMON.UPDATE_RESPONSE, data: { subgroupId: id, groupId, subgroupName } };
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'subgroup', error, 'updateSubgroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Delete subgroup */
export async function deleteSubgroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const subgroupId = req.body.subgroupId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rowCount } = await client.query(
        `UPDATE mr_subgroup
            SET sg_delflag = 1, sg_modified = NOW()
          WHERE sg_tenant_id = $1 AND sg_id = $2 AND sg_delflag = 0`,
        [tenantId, subgroupId]
      );
      if (rowCount > 0) {
        await logUserAction(client, tenantId, userId, `DELETE_SUBGROUP: id=${subgroupId}`);
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'subgroup', error, 'deleteSubgroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}
