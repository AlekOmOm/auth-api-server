import * as service from "../services/clientServer.js";
import { getUserId } from "../utils/session.js";
import { standardizeResponse } from "../utils/responseUtils.js";

/**
 * Handshake with client server
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const handshake = async (req, res, next) => {
   try {
      const result = await service.authenticateClientServer(req);
      res.json(result);
   } catch (error) {
      next(error);
   }
};

/**
 * Register a new client server
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const registerClientServer = async (req, res, next) => {
   try {
      const serviceResult = await service.register({
         clientServerData: req.body,
         userId: getUserId(req.session),
      });
      res.status(201).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Register client server for user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const registerClientServerForUser = async (req, res, next) => {
   try {
      const serviceResult = await service.registerClientServerForUser(
         req.body,
         getUserId(req.session)
      );
      res.status(201).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Get client server info
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getClientServerInfo = async (req, res, next) => {
   try {
      const clientId = req.clientContext?.client_id;
      if (!clientId) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("Client ID not found in context."),
               statusCode: 400,
            })
         );
      }
      const serviceResult = await service.getClientServerById(clientId);
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Get client server info by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getClientServerById = async (req, res, next) => {
   try {
      const serviceResult = await service.getClientServerById(
         req.params.client_id
      );
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Get user client servers
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getUserClientServers = async (req, res, next) => {
   try {
      const serviceResult = await service.getUserClientServers({
         userId: getUserId(req.session),
      });
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Get user client server by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getUserClientServerById = async (req, res, next) => {
   try {
      const serviceResult = await service.getUserClientServer({
         userId: getUserId(req.session),
         clientId: req.params.client_id,
      });
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Update client server info
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const updateClientServerInfo = async (req, res, next) => {
   try {
      const clientId = req.clientContext?.client_id;
      if (!clientId) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("Client ID not found in context for update."),
               statusCode: 400,
            })
         );
      }
      const serviceResult = await service.updateClientServer(
         clientId,
         req.body
      );
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Update user client server by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const updateUserClientServerById = async (req, res, next) => {
   try {
      const serviceResult = await service.updateUserClientServer({
         userId: getUserId(req.session),
         clientId: req.params.client_id,
         updateData: req.body,
      });
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * Delete user client server by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const deleteUserClientServerById = async (req, res, next) => {
   try {
      const serviceResult = await service.deleteUserClientServer({
         userId: getUserId(req.session),
         clientId: req.params.client_id,
      });
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

// This one was missing from the original exports, assuming it's for admin operations
const deleteClientServerById = async (req, res, next) => {
   try {
      const serviceResult = await service.deleteClientServerById(
         req.params.client_id
      );
      res.json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

//  ------------ check logic ------------

/**
 * @description Check if referer URL is a registered URL
 * Extracts referer URL and calls clientServerService.getByUrl
 */
const checkRefererURL = async (req, res, next) => {
   try {
      const refererUrl = req.body?.refererUrl || req.query?.refererUrl;

      if (!refererUrl) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("Referer URL is required"),
               statusCode: 400,
            })
         );
      }
      const serviceResult = await service.getByUrl({
         url: refererUrl,
      });

      if (serviceResult.success) {
         res.status(200).json(
            standardizeResponse({
               data: serviceResult.data,
               message: serviceResult.message,
            })
         );
      } else {
         res.status(serviceResult.status || 400).json(
            standardizeResponse({
               error: new Error(serviceResult.message),
               message: serviceResult.message,
               statusCode: serviceResult.status || 400,
            })
         );
      }
   } catch (error) {
      next(error);
   }
};

// --- export ---
export {
   registerClientServer,
   getClientServerInfo,
   getUserClientServers,
   getUserClientServerById,
   updateClientServerInfo,
   updateUserClientServerById,
   deleteUserClientServerById,
   getClientServerById,
   deleteClientServerById,
   registerClientServerForUser,
   checkRefererURL,
};
