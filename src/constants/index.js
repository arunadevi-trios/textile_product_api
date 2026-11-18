/****************************
 File    : constants
 Purpose : constants variable
 * ********************** */

export const defaultServerResponse = {
  status: 400,
  message: '',
  body: {}
};

export const ERROR_LOG_MESSAGE = {
  PLAT_FORM_NAME: 'API'
};

export const COMMON = {
  ERROR_CODE: '500',
  SUCCESS_CODE: '200',
  UNAUTHORIZED: '401',
  USER_NOT_FOUND: '402',
  ERROR: '500',
  STATUS_ACTIVE: 1,
  STATUS_INACTIVE: 0,
  INVALID_TOKEN: { 'status': '401', 'successcode': '103', 'message': 'Unauthorized User!' },
  INVALID_USER: { 'status': '402', 'successcode': '403', 'message': 'User Not Found!' },
  LOGIN_SUCCESS_RESPONSE: { 'status': '200', 'successcode': '101', 'message': 'Logged in Successfully!' },
  LOGIN_FAIL_RESPONSE: { 'status': '200', 'successcode': '102', 'message': 'Invalid Login ID or Password!' },
  UNAUTHORIZED_RESPONSE: { 'status': '200', 'successcode': '103', 'message': 'Unauthorized User!' },
  INACTIVE_RESPONSE: { 'status': '200', 'successcode': '104', 'message': 'Inactive User!' },
  UPDATE_RESPONSE: { 'status': '200', 'successcode': '202', 'message': 'Updated Successfully!' },
  SAVE_RESPONSE: { 'status': '200', 'successcode': '201', 'message': 'Saved Successfully!' },
  DELETE_RESPONSE: { 'status': '200', 'successcode': '203', 'message': 'Deleted Successfully!' },
  EXIST_RESPONSE: { 'status': '200', 'successcode': '204', 'message': 'Already Exists!' },
  INUSE_RESPONSE: { 'status': '200', 'successcode': '205', 'message': 'Already in use!' },
  DATAFETCH_RESPONSE: { 'status': '200', 'successcode': '206', 'message': 'Data Retrieved!' },
  INVALID_RESPONSE: { 'status': '200', 'successcode': '207', 'message': 'Invalid Data!' },
  NORECORD_RESPONSE: { 'status': '200', 'successcode': '208', 'message': 'No record found!' },
  DUPLICATE_NAME_RESPONSE: { 'status': '200', 'successcode': '204', 'message': 'Name already exists!' },
  GROUP_HAS_SUBGROUPS_RESPONSE: { 'status': '200', 'successcode': '205', 'message': 'Groups with subgroups cannot be deactivated or deleted!' },
  INVALID_GROUP_RESPONSE: { 'status': '200', 'successcode': '207', 'message': 'The selected active group was not found!' },
  DUPLICATE_TAX_RESPONSE: { 'status': '200', 'successcode': '204', 'message': 'That tax percentage already exists!' },
  TOKEN_EXPIRED_RESPONSE: { 'status': '498', 'successcode': '498', 'message': 'Token Expired' },
  REFRESH_TOKEN_MISSING_RESPONSE: { 'status': '498', 'successcode': '498', 'message': 'Refresh token not provided' },
  SESSION_EXPIRED_RESPONSE: { 'status': '401', 'successcode': '401', 'message': 'Your session has expired. Please sign in again.' },
};

export const requestValidationMessage = {
  BAD_REQUEST_CODE: '209',
  BAD_REQUEST: 'Invalid fields',
  TOKEN_MISSING: 'Token missing from header',
  DATA_MISSING: 'Data is missing'
};

