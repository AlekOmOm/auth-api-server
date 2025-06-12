import {
   AuthError,
   ConflictError,
   NotFoundError,
   ValidationError,
} from "../middleware/errorHandler.js";
import { ClientServer, User, Session } from "../models/index.js";
import Repo from "../repo/index.js";
import { toDB } from "../models/functional/index.js";
import { SCHEMAS } from "../repo/connection/TABLES.js";

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
 * @param {*} modelClass - model class
 * @param {*} executor - repoQuery prepared for execution with instance
 * @param {*} message - message to return
 * @param  {...any} args - arguments to pass to the repo function
 * @returns {Object} { message, data }
 */
const pipeline = async (
   ModelClass,
   executor,
   successMessage,
   requestData,
   operationUserId = null
) => {
   try {
      const instance =
         operationUserId && ModelClass.name === "ClientServer"
            ? await ModelClass.fromRequestBody(requestData, operationUserId)
            : await ModelClass.fromRequestBody(requestData);

      if (
         !instance ||
         (typeof instance.isValid === "function" && !instance.isValid())
      ) {
         throw new ValidationError(
            `Invalid data for ${ModelClass.name}`,
            instance?.getErrors ? instance.getErrors() : undefined
         );
      }
      const dbData = toDB(TABLE, instance);
      const result = await executor(dbData);
      if (result === null) {
         throw new NotFoundError(
            `${ModelClass.name} not found or operation failed.`
         );
      }
      return { success: true, data: result, message: successMessage };
   } catch (error) {
      if (
         error instanceof NotFoundError ||
         error instanceof ValidationError ||
         error instanceof ConflictError ||
         error instanceof AuthError
      ) {
         throw error;
      }
      console.error(
         `Service pipeline error for ${ModelClass.name}:`,
         error.message,
         error.stack
      );
      throw new Error(
         `Operation failed in ${ModelClass.name} service: ${error.message}`
      );
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
 * @param {string} params.schema - The schema to query against
 * @returns {Object} {
 *    success: boolean,
 *    message: string,
 *    data: ClientServer[]
 * }
 */
export async function getAll({ userId, schema }) {
   console.log(
      `[SERVICE_GET_ALL_DEBUG] Entered getAll. Received userId: "${userId}", schema: "${schema}" (type: ${typeof schema})`
   );
   try {
      if (!userId) {
         const err = new Error("User ID is required to get client servers.");
         // Consider setting err.statusCode = 400 if your global error handler uses it
         throw err;
      }
      if (!schema) {
         const err = new Error("Schema is required to get client servers.");
         // Consider setting err.statusCode = 400
         throw err;
      }

      const clientServerRepo = repo(schema); // repo(schema) returns new Repo(schema, "client_servers")

      // Corrected to use { user_id: userId } to match the paramExtractor for getByUserId
      const clientServers = await clientServerRepo.query("getByUserId", {
         user_id: userId,
      });

      return {
         success: true,
         message: "Client servers retrieved successfully",
         data: clientServers || [], // Ensure data is an array, even if null/undefined from repo
      };
   } catch (error) {
      console.error(
         `[SERVICE_ERROR] Failed to get client servers for user ${userId} in schema ${schema}:`,
         error.message,
         error.stack
      );
      return {
         success: false,
         message:
            error.message ||
            "Failed to retrieve client servers due to an internal error.",
         data: [], // Return empty array on error for frontend consistency
      };
   }
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
export async function update({ userId, clientId, updateData, schema }) {
   const { data: existingClientServer } = await pipeline(
      ClientServer,
      repoQuery(schema, "getByUserIdAndClientId"),
      "Existing Client server retrieved successfully",
      { userId, clientId }
   );

   if (!existingClientServer) {
      throw new NotFoundError("Client server not found to update.");
   }

   const processedUpdateData = ClientServer.update(
      updateData,
      existingClientServer
   );

   return await pipeline(
      ClientServer,
      repoQuery(schema, "update"),
      "Client server updated successfully",
      processedUpdateData
   );
}

/**
 * Delete client server for a user (owner only) (DELETE)
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.clientId - Client ID from session
 * @returns {Object} Deletion response
 */
export async function deleteByIDs({ userId, clientId, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "deleteByUserIdAndClientId"),
      "Client server deleted successfully",
      { userId, clientId }
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
export async function verifyApiToken({ secretHash }) {
   const authInternalSchema = SCHEMAS.AUTH_NAME;
   return await pipeline(
      ClientServer,
      repoQuery(authInternalSchema, "getBySecretHash"),
      "Client server retrieved successfully",
      { client_secret_hash: secretHash }
   );
}

/**
 * Get client server details by one of its URLs (identifier_url or an authorized_url)
 * This is used by auth service during registration to find the schema from referer.
 * @param {Object} params - Parameters object
 * @param {string} params.url - The URL to look up
 * @param {string} params.schema - The database schema
 * @returns {Object} {
 *    message: string,
 *    data: ClientServer
 * }
 */
export async function getByUrl({ url, schema }) {
   const authInternalSchema = SCHEMAS.AUTH_NAME;
   const operation =
      schema === authInternalSchema ? "getByReferer" : "getByUrl";

   return await pipeline(
      ClientServer,
      repoQuery(schema || authInternalSchema, operation),
      "Client server retrieved successfully",
      url
   );
}

/**
 * get allowed urls for a user
 *  - allowedUrls = identifier_url + entrypoint_url + authorized_urls
 *
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.schema - The database schema
 * @returns {Object} {
 *    message: string,
 *    data: {
 *       allowedUrls: string[]
 *    }
 * }
 */
export async function getAllowedUrls({ userId, schema }) {
   return await pipeline(
      ClientServer,
      repoQuery(schema, "getAllowedUrls"),
      "Allowed URLs retrieved successfully",
      { user_id: userId }
   );
}

/**
 * Fetches client-specific context/details based on a schema name.
 * This is intended for enriching error messages or logs.
 * @param {string} schemaName - The assigned_schema_name of the client server.
 * @returns {Promise<Object|null>} An object with client details or null if not found.
 */
export async function getClientContextForError(schemaName) {
   if (
      !schemaName ||
      schemaName === SCHEMAS.AUTH_NAME ||
      schemaName === SCHEMAS.TEMPLATE_NAME
   ) {
      // Don't attempt to lookup context for auth_internal or template schemas
      return null;
   }
   try {
      const authInternalSchema = SCHEMAS.AUTH_NAME;
      const clientRepo = repo(authInternalSchema); // client_servers table is in auth_internal

      // Assuming repo has a method like findOneBy or a specific getByAssignedSchemaName
      // The query should target the `assigned_schema_name` column.
      const clientServer = await clientRepo.query("findOneBy", {
         assigned_schema_name: schemaName,
      });

      if (clientServer) {
         // Extract only safe and relevant information for error context
         const clientContext = {
            client_id: clientServer.client_id,
            app_name: clientServer.app_name,
            identifier_url: clientServer.identifier_url,
            entry_point_url: clientServer.entry_point_url,
            // Potentially add other fields like a support email or contact if available
         };
         console.log(
            `[getClientContextForError] Found context for schema '${schemaName}':`,
            clientContext
         );
         return clientContext;
      }
      console.log(
         `[getClientContextForError] No client server found for schema name: '${schemaName}'.`
      );
      return null;
   } catch (error) {
      console.error(
         `[getClientContextForError] Error fetching client context for schema '${schemaName}':`,
         error
      );
      return null; // Return null on error to avoid breaking error handling flow
   }
}

const clientServerService = {
   register,
   getAll,
   get,
   update,
   deleteByIDs,
   verifyApiToken,
   getByUrl,
   getAllowedUrls,
   getClientContextForError,
};

export default clientServerService;
