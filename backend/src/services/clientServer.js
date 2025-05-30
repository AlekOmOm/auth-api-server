import * as clientServerRepo from "../repo/repositories/authInternal/repository.js";
import { ClientServer } from "../models/ClientServer.js";

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
 * @param {Object} params - Parameters object
 * @param {Object} params.clientServerData - Client server data from request body
 * @param {string} params.userId - User ID from session
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function registerClientServer({ clientServerData, userId }) {
   try {
      const clientServer = await ClientServer.fromRequestBody(
         clientServerData,
         userId
      );

      const createdClientServer = await clientServerRepo.createClientServer(
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
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer[]
 * }
 */
export async function getUserClientServers({ userId }) {
   try {
      // Repository now returns ClientServer instances
      const clientServers = await clientServerRepo.getClientServersByUserId(
         userId
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
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @returns {Object} Client server details
 */
export async function getUserClientServer({ userId, clientId }) {
   try {
      // Repository now returns ClientServer instance
      const clientServer =
         await clientServerRepo.getClientServerByUserIdAndClientId(
            userId,
            clientId
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
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @param {Object} params.updateData - Data to update
 * @returns {Object} Updated client server
 */
export async function updateUserClientServer({ userId, clientId, updateData }) {
   try {
      // Repository now returns ClientServer instance
      const existingClient =
         await clientServerRepo.getClientServerByUserIdAndClientId(
            userId,
            clientId
         );

      // Create ClientServer instance from validated update data
      const validatedData = ClientServer.validateUpdateData(
         updateData,
         existingClient
      );
      const clientServerToUpdate = ClientServer.fromDb(validatedData);

      // Repository now returns ClientServer instance
      const updatedClient = await clientServerRepo.updateClientServer(
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
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @returns {Object} Deletion response
 */
export async function deleteUserClientServer({ userId, clientId }) {
   try {
      // Repository now returns ClientServer instance
      const deletedClient =
         await clientServerRepo.deleteClientServerByUserIdAndClientId(
            userId,
            clientId
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
 * @param {Object} params - Parameters object
 * @param {string} params.secretHash - Secret hash to verify
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function verifySecretHash({ secretHash }) {
   try {
      const clientServer = await clientServerRepo.getClientServerBySecretHash(
         secretHash
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
 * @param {Object} params - Parameters object
 * @param {string} params.refererUrl - Referer URL to check
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function checkReferer({ refererUrl }) {
   try {
      const clientServer = await clientServerRepo.getClientServerByReferer(
         refererUrl
      );

      if (!clientServer) {
         return {
            success: false,
            message: "Referer URL is not a registered URL",
            data: null,
         };
      }

      return {
         success: true,
         message: "Referer URL is a registered URL",
         data: clientServer,
      };
   } catch (error) {
      console.error(
         `[ClientServerService] Error in checkReferer for ${refererUrl}:`,
         error
      );
      return {
         success: false,
         message:
            error.message ||
            "An unexpected error occurred while checking the referer.",
         data: null,
      };
   }
}

/**
 * Get client server details by one of its URLs (identifier_url or an authorized_url)
 * This is used by auth service during registration to find the schema from referer.
 * @param {string} url - The URL to look up
 * @returns {Promise<Object|null>} Client server data or null if not found. Structure: { success: boolean, data?: ClientServer, message?: string }
 */
export async function getClientServerByUrl(url) {
   try {
      console.log(
         `[ClientServerService] Attempting to find client server by URL: ${url}`
      );
      const clientServer = await clientServerRepo.findClientServerByUrl(url);

      if (clientServer) {
         console.log(
            `[ClientServerService] Found client server for URL ${url}:`,
            clientServer.name
         );
         return { success: true, data: clientServer };
      } else {
         console.log(
            `[ClientServerService] No client server found for URL ${url}`
         );
         return {
            success: false,
            message: "Client server not found for the given URL.",
         };
      }
   } catch (error) {
      console.error(
         `[ClientServerService] Error in getClientServerByUrl for ${url}:`,
         error
      );
      return {
         success: false,
         message: error.message || "Error finding client server by URL.",
      };
   }
}

export const clientServerService = {
   registerClientServer,
   getUserClientServers,
   getUserClientServer,
   updateUserClientServer,
   deleteUserClientServer,
   verifySecretHash,
   checkReferer,
   getClientServerByUrl,
};

export default clientServerService;
