/** Group controller */
import * as groupService from '../../services/master/group.service.js';

/** Get group list */
export async function listGroups(req, res) {
  let response = {};
  try {
    const responseFromService = await groupService.listGroups(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Get group details */
export async function getGroup(req, res) {
  let response = {};
  try {
    const responseFromService = await groupService.getGroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Create group */
export async function createGroup(req, res) {
  let response = {};
  try {
    const responseFromService = await groupService.createGroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Update group */
export async function updateGroup(req, res) {
  let response = {};
  try {
    const responseFromService = await groupService.updateGroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Delete group */
export async function deleteGroup(req, res) {
  let response = {};
  try {
    const responseFromService = await groupService.deleteGroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}
