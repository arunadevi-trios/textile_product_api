/** Tax controller */
import * as taxService from '../../services/master/tax.service.js';

/** Get tax list */
export async function listTaxes(req, res) {
  let response = {};
  try {
    const responseFromService = await taxService.listTaxes(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Get tax details */
export async function getTax(req, res) {
  let response = {};
  try {
    const responseFromService = await taxService.getTax(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Create tax */
export async function createTax(req, res) {
  let response = {};
  try {
    const responseFromService = await taxService.createTax(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Update tax */
export async function updateTax(req, res) {
  let response = {};
  try {
    const responseFromService = await taxService.updateTax(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Delete tax */
export async function deleteTax(req, res) {
  let response = {};
  try {
    const responseFromService = await taxService.deleteTax(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}
