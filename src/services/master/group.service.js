/** Group service */
import { errorlog } from '../errorLogService.js';
import { COMMON, ERROR_LOG_MESSAGE } from '../../constants/index.js';
import { validateToken, getStatusCondition, getPagination, logUserAction } from '../common.js';
import { pool } from '../../config/database.js';

/** Get group list */
export async function listGroups(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const { page = 1, limit = 20, status = 'active', search } = req.body;
    const tenantId = varDecoded.tenantId;
    const filters = ['g.gr_tenant_id = $1', 'g.gr_delflag = 0', getStatusCondition(status, 'g.gr_status')];
    const values = [tenantId];
    if (search) {
      values.push(`%${search}%`);
      filters.push(`g.gr_name ILIKE $${values.length}`);
    }
    const where = filters.join(' AND ');
    const { offset } = getPagination(page, limit);

    const countResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total FROM mr_group g WHERE ${where}`, values
    );
    const listResult = await pool.query(
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
           ON s.sg_tenant_id = g.gr_tenant_id AND s.sg_gr_id = g.gr_id AND s.sg_delflag = 0
        WHERE ${where}
        GROUP BY g.gr_id
        ORDER BY g.gr_name, g.gr_id
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    if (listResult.rowCount > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: { group_list: listResult.rows, total: countResult.rows[0].total, page, limit } };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: { group_list: [] } };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'group', error, 'listGroups');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Get group details */
export async function getGroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const groupId = req.body.groupId ?? req.params?.id;
    const tenantId = varDecoded.tenantId;

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
           ON s.sg_tenant_id = g.gr_tenant_id AND s.sg_gr_id = g.gr_id AND s.sg_delflag = 0
        WHERE g.gr_tenant_id = $1 AND g.gr_id = $2 AND g.gr_delflag = 0
        GROUP BY g.gr_id`,
      [tenantId, groupId]
    );

    if (rows.length > 0) {
      return { ...COMMON.DATAFETCH_RESPONSE, data: rows[0] };
    }
    return { ...COMMON.NORECORD_RESPONSE, data: {} };
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'group', error, 'getGroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Create group */
export async function createGroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { groupName } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO mr_group (gr_tenant_id, gr_name, gr_maker_id)
         VALUES ($1, $2, $3)
         RETURNING gr_id AS "groupId"`,
        [tenantId, groupName, userId]
      );
      const groupId = rows[0].groupId;
      await logUserAction(client, tenantId, userId, `CREATE_GROUP: id=${groupId}, name=${groupName}`);
      await client.query('COMMIT');
      return { ...COMMON.SAVE_RESPONSE, data: { groupId, groupName } };
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'group', error, 'createGroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Update group */
export async function updateGroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const { groupId, groupName, statusId } = req.body;
    const id = groupId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check for subgroups if deactivating
      if (statusId === 0) {
        const subCheck = await client.query(
          `SELECT EXISTS (
             SELECT 1 FROM mr_subgroup WHERE sg_tenant_id = $1 AND sg_gr_id = $2 AND sg_delflag = 0
           ) AS "hasSubgroups"`,
          [tenantId, id]
        );
        if (subCheck.rows[0].hasSubgroups) {
          await client.query('ROLLBACK');
          return COMMON.GROUP_HAS_SUBGROUPS_RESPONSE;
        }
      }

      const { rows } = await client.query(
        `UPDATE mr_group
            SET gr_name = $3, gr_status = COALESCE($4, gr_status), gr_modified = NOW()
          WHERE gr_tenant_id = $1 AND gr_id = $2 AND gr_delflag = 0
          RETURNING gr_id AS "groupId"`,
        [tenantId, id, groupName, statusId ?? null]
      );
      if (!rows[0]) {
        await client.query('ROLLBACK');
        return { ...COMMON.NORECORD_RESPONSE, data: {} };
      }
      await logUserAction(client, tenantId, userId, `UPDATE_GROUP: id=${id}`);
      await client.query('COMMIT');
      return { ...COMMON.UPDATE_RESPONSE, data: { groupId: id, groupName } };
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'group', error, 'updateGroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}

/** Delete group */
export async function deleteGroup(req) {
  try {
    const varDecoded = await validateToken(req);
    if (!varDecoded) { return COMMON.INVALID_TOKEN; }

    const tenantId = varDecoded.tenantId;
    const userId = Number(varDecoded.sub);
    const groupId = req.body.groupId ?? req.params?.id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check for subgroups
      const subCheck = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM mr_subgroup WHERE sg_tenant_id = $1 AND sg_gr_id = $2 AND sg_delflag = 0
         ) AS "hasSubgroups"`,
        [tenantId, groupId]
      );
      if (subCheck.rows[0].hasSubgroups) {
        await client.query('ROLLBACK');
        return COMMON.GROUP_HAS_SUBGROUPS_RESPONSE;
      }

      const { rowCount } = await client.query(
        `UPDATE mr_group
            SET gr_delflag = 1, gr_modified = NOW()
          WHERE gr_tenant_id = $1 AND gr_id = $2 AND gr_delflag = 0`,
        [tenantId, groupId]
      );
      if (rowCount > 0) {
        await logUserAction(client, tenantId, userId, `DELETE_GROUP: id=${groupId}`);
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
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'group', error, 'deleteGroup');
    return { status: COMMON.ERROR_CODE, statuscode: COMMON.ERROR_CODE, message: error.message };
  }
}
