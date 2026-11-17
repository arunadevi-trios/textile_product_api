export function normalizeTenantId(value) {
  const tenantId = typeof value === 'string' && /^[1-9]\d*$/.test(value)
    ? Number(value)
    : value
  return Number.isSafeInteger(tenantId) && tenantId > 0 ? tenantId : null
}
