import * as clientServerRepo from "../repo/repositories/authInternal/repository.js";
import { ClientServer } from "../models/models.js";
import { getUserId, getClientId } from "../utils/session.js";

/**
 * Service layer for Client Server CRUD operations
 *
 * Uses ClientServer model for proper encapsulation of ID generation,
 * secret generation, and hashing.
 *
 * CRUD operations:
 * - registerClientServer (CREATE)
 * - getUserClientServers (READ - list)
 * - getUserClientServer (READ - single)
 * - updateUserClientServer (UPDATE)
 * - deleteUserClientServer (DELETE)
 */

/**
 * Register a new client server (CREATE)
 * @param {Object} req - Express request object
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function registerClientServer(req) {
   try {
      const clientServer = await ClientServer.fromRequestBody(
         req.body,
         req.session.userId
      );

      const createdClientServer = await clientServerRepo.createClientServer(
         req,
         clientServer
      );

      return {
         message: "Client server registered successfully",
         data: createdClientServer,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Get all client servers for a user (READ - list)
 * @param {Object} req - Express request object with session
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer[]
 * }
 */
export async function getUserClientServers(req) {
   try {
      // Repository now returns ClientServer instances
      const clientServers = await clientServerRepo.getClientServersByUserId(
         req,
         getUserId(req.session)
      );

      return {
         message: "Client servers retrieved successfully",
         data: clientServers,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Get specific client server for a user (READ - single)
 * @param {Object} req - Express request object with session
 * @returns {Object} Client server details
 */
export async function getUserClientServer(req) {
   try {
      // Repository now returns ClientServer instance
      const clientServer =
         await clientServerRepo.getClientServerByUserIdAndClientId(
            req,
            getUserId(req.session),
            getClientId(req.session)
         );

      return {
         message: "Client server retrieved successfully",
         data: clientServer,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Update client server for a user (UPDATE)
 * @param {Object} req - Express request object with session
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated client server
 */
export async function updateUserClientServer(req, updateData) {
   try {
      // Repository now returns ClientServer instance
      const existingClient =
         await clientServerRepo.getClientServerByUserIdAndClientId(
            req,
            getUserId(req.session),
            getClientId(req.session)
         );

      // Create ClientServer instance from validated update data
      const validatedData = ClientServer.validateUpdateData(
         updateData,
         existingClient
      );
      const clientServerToUpdate = ClientServer.fromDb(validatedData);

      // Repository now returns ClientServer instance
      const updatedClient = await clientServerRepo.updateClientServer(
         req,
         clientServerToUpdate
      );

      return {
         message: "Client server updated successfully",
         data: updatedClient,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Delete client server for a user (owner only) (DELETE)
 * @param {Object} req - Express request object with session
 * @param {string} clientId - Client ID
 * @returns {Object} Deletion response
 */
export async function deleteUserClientServer(req) {
   try {
      // Repository now returns ClientServer instance
      const deletedClient =
         await clientServerRepo.deleteClientServerByUserIdAndClientId(
            req,
            getUserId(req.session),
            getClientId(req.session)
         );

      return {
         message: "Client server deleted successfully",
         data: deletedClient,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Verify API token and return client information
 * @param {string} token - API token to verify
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function verifySecretHash(req) {
   try {
      const clientServer = await clientServerRepo.getClientServerBySecretHash(
         req.body.secretHash
      );

      if (!clientServer) {
         throw new Error("Invalid API token");
      }

      return {
         message: "Secret hash verified successfully",
         data: clientServer,
      };
   } catch (error) {
      throw new Error("Invalid API token");
   }
}

/**
 * Check if referer URL is a registered URL
 * @param {Object} req - Express request object
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function checkReferer(req) {
   try {
      const url = req.body.referer;
      const clientServer = await clientServerRepo.getClientServerByReferer(url);

      if (!clientServer) {
         return {
            message: "Referer URL is not a registered URL",
            data: null,
         };
      }

      return {
         message: "Referer URL is a registered URL",
         data: clientServer,
      };
   } catch (error) {
      throw error;
   }
}

export const clientServerService = {
   registerClientServer,
   getUserClientServers,
   getUserClientServer,
   updateUserClientServer,
   deleteUserClientServer,
   verifySecretHash,
};

export default clientServerService;
