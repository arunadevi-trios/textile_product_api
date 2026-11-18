function getAction(req) {
  const path = req.path.replace(/\/+$/, '') || '/'
  if (req.method === 'POST' && (path === '/' || path.endsWith('/setMaster'))) return 'save'
  if (req.method === 'PUT' || path.endsWith('/updateMaster')) return 'update'
  if (req.method === 'DELETE' || path.endsWith('/deleteMaster')) return 'delete'
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
    const httpStatus = this.statusCode || 200
    if (httpStatus >= 400) {
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
    const isPage = Array.isArray(body?.data) && body.pagination
    return sendJson.call(this, {
      status: '200',
      successcode: action === 'save' ? '201' : '200',
      message: successMessages[action],
      data: isPage ? body.data : body ?? null,
      ...(isPage ? { pagination: body.pagination } : {}),
    })
  }
  next()
}
