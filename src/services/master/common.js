export function getStatusCondition(status, column) {
  if (status === 'active') return `${column} = 1`
  if (status === 'inactive') return `${column} = 0`
  return 'TRUE'
}

export function getPagination(page, limit) {
  return { offset: (page - 1) * limit, limit }
}

export function formatPage(rows, total, page, limit) {
  return {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export function logUserAction(client, tenantId, userId, originator) {
  return client.query(
    `INSERT INTO tbl_userlog (tenant_id, user_id, log_date, originator)
     VALUES ($1, $2, NOW(), $3)`,
    [tenantId, userId, originator],
  )
}
