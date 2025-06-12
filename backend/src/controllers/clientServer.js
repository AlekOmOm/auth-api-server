import * as service from "../services/clientServer.js";
import { getUserId } from "../utils/request/session.js";
import { standardizeResponse } from "../utils/responseUtils.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import {
   ValidationError,
   NotFoundError,
   // AuthError, // If needed for specific auth issues within this controller
   // ConflictError, // If needed for resource conflicts
} from "../middleware/errorHandler.js";

/**
 * Handshake with client server
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const handshakeController = async (req, res, next) => {
   const result = await service.authenticateClientServer(req);
   // Assuming service.authenticateClientServer throws on error or result contains success/error info
   if (result.success === false) {
      // Or however service indicates error
      throw new AuthError(result.message || "Client handshake failed");
   }
   res.json(result); // Or standardizeResponse if preferred for consistency
};

/**
 * Register a new client server
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const registerClientServerController = async (req, res, next) => {
   const userId = getUserId(req.session); // Can throw if session is invalid, caught by asyncErrorHandler
   if (!req.body || Object.keys(req.body).length === 0) {
      throw new ValidationError(
         "Request body is required for client server registration."
      );
   }
   const serviceResult = await service.register({
      clientServerData: req.body,
      userId: userId,
   });
   res.status(201).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Register client server for user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const registerClientServerForUserController = async (req, res, next) => {
   const userId = getUserId(req.session);
   if (!req.body || Object.keys(req.body).length === 0) {
      throw new ValidationError(
         "Request body is required for client server registration for user."
      );
   }
   const serviceResult = await service.registerClientServerForUser(
      req.body,
      userId
   );
   res.status(201).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Get client server info
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getClientServerInfoController = async (req, res, next) => {
   const clientId = req.clientContext?.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID not found in context.");
   }
   const serviceResult = await service.getClientServerById(clientId);
   // service.getClientServerById should throw NotFoundError if not found
   res.json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Get client server info by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getClientServerByIdController = async (req, res, next) => {
   const clientId = req.params.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID parameter is required.");
   }
   const serviceResult = await service.getClientServerById(clientId);
   // service.getClientServerById should throw NotFoundError if not found
   res.json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Get user client servers
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getUserClientServersController = async (req, res, next) => {
   const userId = getUserId(req.session);
   const schema = req.schema;
   // No specific validation here, service layer should handle logic
   const serviceResult = await service.getAll({
      userId: userId,
      schema: schema,
   });
   res.json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Get user client server by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const getUserClientServerByIdController = async (req, res, next) => {
   const userId = getUserId(req.session);
   const clientId = req.params.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID parameter is required.");
   }
   const serviceResult = await service.getUserClientServer({
      userId: userId,
      clientId: clientId,
   });
   // service.getUserClientServer should throw NotFoundError if not found for user
   res.json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Update client server info
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const updateClientServerInfoController = async (req, res, next) => {
   const clientId = req.clientContext?.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID not found in context for update.");
   }
   if (!req.body || Object.keys(req.body).length === 0) {
      throw new ValidationError("Request body is required for update.");
   }
   const serviceResult = await service.updateClientServer(clientId, req.body);
   // service.updateClientServer should throw NotFoundError if not found
   res.json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Update user client server by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const updateUserClientServerByIdController = async (req, res, next) => {
   const userId = getUserId(req.session);
   const clientId = req.params.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID parameter is required.");
   }
   if (!req.body || Object.keys(req.body).length === 0) {
      throw new ValidationError("Request body is required for update.");
   }
   const serviceResult = await service.updateUserClientServer({
      userId: userId,
      clientId: clientId,
      updateData: req.body,
   });
   // service.updateUserClientServer should throw NotFoundError if not found
   res.json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * Delete user client server by ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
const deleteUserClientServerByIdController = async (req, res, next) => {
   const userId = getUserId(req.session);
   const clientId = req.params.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID parameter is required.");
   }
   const serviceResult = await service.deleteUserClientServer({
      userId: userId,
      clientId: clientId,
   });
   // service.deleteUserClientServer should throw NotFoundError if not found
   res.json(
      standardizeResponse({
         data: serviceResult.data, // May not have data on delete, depends on service
         message: serviceResult.message,
      })
   );
};

// This one was missing from the original exports, assuming it's for admin operations
const deleteClientServerByIdController = async (req, res, next) => {
   const clientId = req.params.client_id;
   if (!clientId) {
      throw new ValidationError("Client ID parameter is required.");
   }
   const serviceResult = await service.deleteClientServerById(clientId);
   // service.deleteClientServerById should throw NotFoundError if not found
   res.json(
      standardizeResponse({
         data: serviceResult.data, // May not have data on delete
         message: serviceResult.message,
      })
   );
};

//  ------------ check logic ------------

/**
 * @description Check if referer URL is a registered URL
 * Extracts referer URL and calls clientServerService.getByUrl
 */
const checkRefererURLController = async (req, res, next) => {
   const refererUrl = req.body?.refererUrl || req.query?.refererUrl;

   if (!refererUrl) {
      throw new ValidationError("Referer URL is required", [
         {
            field: "refererUrl",
            message: "Referer URL is missing from body or query.",
         },
      ]);
   }
   const serviceResult = await service.getByUrl({ url: refererUrl });

   if (serviceResult.success) {
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } else {
      // Use NotFoundError for consistency if the URL is simply not found
      // Or ValidationError if it's a bad request for other reasons based on serviceResult
      throw new NotFoundError(
         serviceResult.message || "Referer URL not found or invalid."
      );
   }
};

// --- export ---
export const handshake = asyncErrorHandler(handshakeController);
export const registerClientServer = asyncErrorHandler(
   registerClientServerController
);
export const getClientServerInfo = asyncErrorHandler(
   getClientServerInfoController
);
export const getUserClientServers = asyncErrorHandler(
   getUserClientServersController
);
export const getUserClientServerById = asyncErrorHandler(
   getUserClientServerByIdController
);
export const updateClientServerInfo = asyncErrorHandler(
   updateClientServerInfoController
);
export const updateUserClientServerById = asyncErrorHandler(
   updateUserClientServerByIdController
);
export const deleteUserClientServerById = asyncErrorHandler(
   deleteUserClientServerByIdController
);
export const getClientServerById = asyncErrorHandler(
   getClientServerByIdController
);
export const deleteClientServerById = asyncErrorHandler(
   deleteClientServerByIdController
);
export const registerClientServerForUser = asyncErrorHandler(
   registerClientServerForUserController
);
export const checkRefererURL = asyncErrorHandler(checkRefererURLController);
