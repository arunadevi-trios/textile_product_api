import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';
import { COMMON, ERROR_LOG_MESSAGE } from '../constants/index.js';
import { errorlog } from './errorLogService.js';

/** Validate JWT access token from request header */
export async function validateToken(req) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    const token = authHeader.split(' ')[1];
    if (!token) return false;

    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: 'textile-product-api',
    });
    return decoded;
  } catch (error) {
    await errorlog(ERROR_LOG_MESSAGE.PLAT_FORM_NAME, 'Common-Service', error, 'validateToken');
    return false;
  }
}

/** Check if user ID is valid and active */
export async function checkUserId(reqBody) {
  try {
    const userId = reqBody.user_id ?? reqBody.userId;
    const userName = reqBody.user_name ?? reqBody.userName;
    if (!userId || !userName || String(userName).trim() === '') {
      return 0;
    }
    const result = await pool.query(
      'SELECT COUNT(user_id)::INTEGER AS count FROM tbl_users WHERE user_id = $1 AND LOWER(TRIM(user_name)) = LOWER(TRIM($2)) AND status = $3',
      [userId, String(userName), COMMON.STATUS_ACTIVE]
    );
    return result?.rows[0]?.count ? Number(result.rows[0].count) : 0;
  } catch (error) {
    throw new Error(error);
  }
}

/** Get status filter condition for SQL queries */
export function getStatusCondition(status, column) {
  if (status === 'active') return `${column} = 1`;
  if (status === 'inactive') return `${column} = 0`;
  return 'TRUE';
}

/** Calculate pagination offset */
export function getPagination(page, limit) {
  return { offset: (page - 1) * limit, limit };
}

/** Format paginated response */
export function formatPage(rows, total, page, limit) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/** Log user action to database */
export function logUserAction(client, tenantId, userId, originator) {
  return client.query(
    `INSERT INTO tbl_userlog (tenant_id, user_id, log_date, originator)
     VALUES ($1, $2, NOW(), $3)`,
    [tenantId, userId, originator],
  );
}
