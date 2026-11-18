function getAction(req) {
  const path = req.path.replace(/\/+$/, '') || '/'
  if (path.startsWith('/set')) return 'save'
  if (path.startsWith('/update')) return 'update'
  if (path.startsWith('/delete')) return 'delete'
  return 'fetch'
}

const successMessages = {
  save: 'Saved Successfully!',
  update: 'Updated Successfully!',
  delete: 'Deleted Successfully!',
  fetch: 'Fetched Successfully!',
}

export function masterResponse(req, res, next) {
  const sendJson = res.json
  res.json = function sendMasterResponse(body) {
    const bodyStatus = Number(body?.status)
    const httpStatus = this.statusCode >= 400
      ? this.statusCode
      : Number.isInteger(bodyStatus) && bodyStatus >= 400
        ? bodyStatus
        : this.statusCode || 200
    if (httpStatus >= 400) {
      this.statusCode = httpStatus
      const message = body?.error?.message || body?.message || 'The request failed.'
      const errorResponse = body && typeof body === 'object' && !Array.isArray(body)
        ? body
        : {}
      return sendJson.call(this, {
        ...errorResponse,
        status: String(httpStatus),
        successcode: String(httpStatus),
        message,
      })
    }

    const action = getAction(req)
    const listKey = Object.keys(body?.data || {}).find((key) => (
      ['group_list', 'subgroup_list', 'brand_list', 'tax_list'].includes(key)
    ))
    const listRows = listKey ? body.data[listKey] : null
    const isPage = Array.isArray(listRows) || (Array.isArray(body?.data) && body.pagination)
    const page = Number(body?.data?.page ?? req.body?.page) || 1
    const limit = Number(body?.data?.limit ?? req.body?.limit) || 20
    const total = Number(body?.data?.total) || 0
    return sendJson.call(this, {
      status: String(body?.status || '200'),
      successcode: String(body?.successcode || (
        action === 'save' ? '201' : action === 'update' ? '202' : action === 'delete' ? '203' : '206'
      )),
      message: body?.message || successMessages[action],
      data: Array.isArray(listRows) ? listRows : body?.data ?? null,
      ...(isPage
        ? {
            pagination: body.pagination ?? {
              page,
              limit,
              total,
              totalPages: Math.max(1, Math.ceil(total / limit)),
            },
          }
        : {}),
    })
  }
  next()
}
