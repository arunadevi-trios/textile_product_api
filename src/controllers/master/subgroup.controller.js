/** Subgroup controller */
import * as subgroupService from '../../services/master/subgroup.service.js';

/** Get subgroup list */
export async function listSubgroups(req, res) {
  let response = {};
  try {
    const responseFromService = await subgroupService.listSubgroups(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Get subgroup details */
export async function getSubgroup(req, res) {
  let response = {};
  try {
    const responseFromService = await subgroupService.getSubgroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Create subgroup */
export async function createSubgroup(req, res) {
  let response = {};
  try {
    const responseFromService = await subgroupService.createSubgroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Update subgroup */
export async function updateSubgroup(req, res) {
  let response = {};
  try {
    const responseFromService = await subgroupService.updateSubgroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Delete subgroup */
export async function deleteSubgroup(req, res) {
  let response = {};
  try {
    const responseFromService = await subgroupService.deleteSubgroup(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}
