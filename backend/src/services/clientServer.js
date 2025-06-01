import ClientServer from "../models/ClientServer.js";
import Repo from "../repo/index.js";
// import { operations } from "../repo/connection/queries/index.js"; // Unused import
import { toDB, fromDB } from "../models/functional/index.js";
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

// --- pure functions ---

/**
 * Repo instance
 */
const TABLE = "client_servers";
const repo = (schema) => new Repo(schema, TABLE);
const repoQuery = (schema, operationName) => (instance) =>
   repo(schema).query(operationName, instance);

/**
 * pipeline function
 * - three part flow:
 *   1. validate request body
 *   2. execute repo function
 *   3. return result
 * @async
 * @param {*} model - model class
 * @param {*} executor - repoQuery prepared for execution with instance
 * @param {*} message - message to return
 * @param  {...any} args - arguments to pass to the repo function
 * @returns {Object} { message, data }
 */
const pipeline = async (model, executor, message, ...args) => {
   try {
      const instance = await model.fromRequestBody(...args);
      const result = await executor(instance);
      return {
         message: message,
         data: result,
      };
   } catch (error) {
      throw error;
   }
};

// --- service functions ---

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
export async function register({ clientServerData, userId, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "create"),
      "Client server registered successfully",
      clientServerData,
      userId
   );
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
export async function getAll({ userId, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "getByUserId"),
      "Client servers retrieved successfully",
      userId
   );
}

/**
 * Get specific client server for a user (READ - single)
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @returns {Object} Client server details
 */
export async function get({ userId, clientId = null, schema }) {
   const operation = clientId ? "getByUserIdAndClientId" : "getByUserId";
   const args = clientId ? [userId, clientId] : [userId];

   return await pipeline(
      ClientServer,
      repoQuery(schema, operation),
      "Client server retrieved successfully",
      ...args
   );
}

/**
 * Update client server for a user (UPDATE)
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @param {Object} params.updateData - Data to update
 *                  - partial data -- not full ClientServer instance
 * @returns {Object} Updated client server
 */
export async function updateUserClientServer({
   userId,
   clientId,
   updateData,
   schema,
}) {
   const { data: existingClientServer } = await pipeline(
      ClientServer,
      repoQuery(schema, "getByUserIdAndClientId"),
      "Existing Client server retrieved successfully",
      userId,
      clientId
   );

   return await pipeline(
      ClientServer,
      repoQuery(schema, "update"),
      "Client server updated successfully",
      ClientServer.update(updateData, existingClientServer)
   );
}

/**
 * Delete client server for a user (owner only) (DELETE)
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @returns {Object} Deletion response
 */
export async function deleteUserClientServer({ userId, clientId, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "deleteByUserIdAndClientId"),
      "Client server deleted successfully",
      userId,
      clientId
   );
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
export async function verifySecretHash({ secretHash, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "getBySecretHash"),
      "Client server retrieved successfully",
      secretHash
   );
}

/**
 * Get client server details by one of its URLs (identifier_url or an authorized_url)
 * This is used by auth service during registration to find the schema from referer.
 * @param {string} url - The URL to look up
 * @returns {Promise<Object|null>} Client server data or null if not found. Structure: { success: boolean, data?: ClientServer, message?: string }
 */
export async function getByUrl({ url, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "getByReferer"),
      "Client server retrieved successfully",
      url
   );
}

export const clientServerService = {
   register,
   getUserClientServers: getAll,
   getUserClientServer: get,
   updateUserClientServer,
   deleteUserClientServer,
   verifySecretHash,
   getByUrl,
};

export default clientServerService;
