/** Brand controller */
import * as brandService from '../../services/master/brand.service.js';

/** Get brand list */
export async function listBrands(req, res) {
  let response = {};
  try {
    const responseFromService = await brandService.listBrands(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Get brand details */
export async function getBrand(req, res) {
  let response = {};
  try {
    const responseFromService = await brandService.getBrand(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Create brand */
export async function createBrand(req, res) {
  let response = {};
  try {
    const responseFromService = await brandService.createBrand(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Update brand */
export async function updateBrand(req, res) {
  let response = {};
  try {
    const responseFromService = await brandService.updateBrand(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}

/** Delete brand */
export async function deleteBrand(req, res) {
  let response = {};
  try {
    const responseFromService = await brandService.deleteBrand(req);
    if (responseFromService) {
      response = responseFromService;
    }
  } catch (error) {
    response.message = error.message;
  }
  return res.send(response);
}
