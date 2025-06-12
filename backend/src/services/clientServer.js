import {
   AuthError,
   ConflictError,
   NotFoundError,
   ValidationError,
} from "../utils/customErrors.js";
import { ClientServer, User, Session } from "../models/index.js";
import Repo from "../repo/index.js";
import { toDB } from "../models/functional/index.js";
import config from "../config/env.js";

const { SCHEMAS } = config;

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
            ? ModelClass.fromRequestBody(requestData, operationUserId)
            : ModelClass.fromRequestBody(requestData);

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
   // clientServerData will be req.body.
   // userId is null for public registration (handled by the controller).
   // schema is "auth_internal" for public registration.

   const newClientServer = ClientServer.fromRequestBody(
      clientServerData,
      userId
   );

   // Validate the model instance
   const validatedClientServer = newClientServer.validate(); // ClientServer.validate() is a no-op currently
   if (!validatedClientServer.isValid()) {
      // isValid() is from BaseModel
      throw new ValidationError(
         "Client server data is invalid",
         validatedClientServer.getErrors()
      );
   }

   // Get the plain secret *before* it's potentially lost or cleared
   // This method also deletes _plainClientSecret from the instance.
   const plainClientSecret = validatedClientServer.getPlainClientSecretOnce();

   // Prepare data for database insertion (this will include client_secret_hash)
   const dbObject = validatedClientServer.toDatabaseObject();

   // Save to database
   const clientServerRepo = new Repo(schema, "client_servers");
   // Assuming repo.create returns the created record from DB or the input object if not returning anything
   await clientServerRepo.create(dbObject);

   // Construct the response data to match existing test expectations + new client_secret
   const responseData = {
      _errors: validatedClientServer.getErrors(), // from BaseModel, should be []
      _isValid: validatedClientServer.isValid(), // from BaseModel, should be true
      app_name: validatedClientServer.app_name,
      identifier_url: validatedClientServer.identifier_url,
      entry_point_url: validatedClientServer.entry_point_url,
      authorized_urls: validatedClientServer.authorized_urls,
      user_id: validatedClientServer.user_id, // null for public registration
      client_id: validatedClientServer.client_id,
      assigned_schema_name: validatedClientServer.assigned_schema_name,
      client_secret_hash: validatedClientServer.client_secret_hash, // Keep this, as tests might (implicitly) expect it or it's good for audit
      client_secret: plainClientSecret, // *** Add the plain secret for the response ***
      // created_at and updated_at are not in the current test response for this, so omitting.
   };

   return {
      message: "Client server registered successfully",
      data: responseData,
   };
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
   // When schema is not provided (e.g., initial detection from referer),
   // always query auth_internal using the getByReferer operation.
   // If a specific schema is provided, this function might be used for other purposes,
   // but for schema detection, it must hit auth_internal.
   // const targetSchema = schema || authInternalSchema; // OLD LOGIC
   // const operation =
   //    targetSchema === authInternalSchema ? "getByReferer" : "getByUrl"; // OLD LOGIC

   // NEW LOGIC: Client server definitions (URL to schema mappings) are always in auth_internal.
   // So, any lookup by URL for these definitions must target auth_internal.
   // We assume "getByReferer" is the correct and defined operation for this lookup.
   const querySchema = authInternalSchema;
   const operation = "getByReferer";

   // The following warning is no longer relevant if we always use "getByReferer"
   // if (operation === "getByUrl" && targetSchema !== authInternalSchema) {
   //    console.warn(
   //       `[ClientServerService.getByUrl] Attempting to use operation 'getByUrl' on schema '${targetSchema}'. This might fail if not defined.`
   //    );
   // }

   return await pipeline(
      ClientServer,
      repoQuery(querySchema, operation), // Use querySchema and the determined operation
      "Client server retrieved successfully",
      url // This 'url' is the requestData for fromRequestBody, which correctly sets identifier_url on the instance
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

/**
 * Register client server for a logged-in user
 * This is an alias for the register function used by user-facing endpoints
 */
export async function registerClientServerForUser(clientServerData, userId) {
   const schema = "auth_internal";

   // Ensure required fields are present
   const processedData = { ...clientServerData };

   // Set default values for missing fields
   if (
      !processedData.identifier_url &&
      processedData.allowed_return_urls &&
      processedData.allowed_return_urls.length > 0
   ) {
      processedData.identifier_url = processedData.allowed_return_urls[0];
   }

   if (
      !processedData.entry_point_url &&
      processedData.allowed_return_urls &&
      processedData.allowed_return_urls.length > 0
   ) {
      processedData.entry_point_url = processedData.allowed_return_urls[0];
   }

   return await register({ clientServerData: processedData, userId, schema });
}

/**
 * Get a single client server by ID
 */
export async function getClientServerById(clientId) {
   const schema = "auth_internal";
   return await pipeline(
      ClientServer,
      repoQuery(schema, "get"),
      "Client server retrieved successfully",
      { client_id: clientId }
   );
}

/**
 * Get client server for a specific user
 */
export async function getUserClientServer({ userId, clientId }) {
   const schema = "auth_internal";
   return await get({ userId, clientId, schema });
}

/**
 * Update client server for a user
 */
export async function updateUserClientServer({ userId, clientId, updateData }) {
   const schema = "auth_internal";
   return await update({ userId, clientId, updateData, schema });
}

/**
 * Delete client server for a user
 */
export async function deleteUserClientServer({ userId, clientId }) {
   const schema = "auth_internal";
   return await deleteByIDs({ userId, clientId, schema });
}

/**
 * Update client server by ID (admin only)
 */
export async function updateClientServer(clientId, updateData) {
   const schema = "auth_internal";
   const { data: existingClientServer } = await getClientServerById(clientId);

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
 * Delete client server by ID (admin only)
 */
export async function deleteClientServerById(clientId) {
   const schema = "auth_internal";
   return await pipeline(
      ClientServer,
      repoQuery(schema, "delete"),
      "Client server deleted successfully",
      { client_id: clientId }
   );
}

/**
 * Authenticate client server and return token
 */
export async function authenticateClientServer(req) {
   const { client_id, client_secret } = req.body;

   if (!client_id || !client_secret) {
      throw new ValidationError("Client ID and secret are required");
   }

   const schema = "auth_internal";
   const { data: clientServer } = await pipeline(
      ClientServer,
      repoQuery(schema, "get"),
      "Client server retrieved",
      { client_id }
   );

   if (!clientServer) {
      throw new AuthError("Invalid client credentials");
   }

   const isValid = ClientServer.verifySecret(
      client_secret,
      clientServer.client_secret_hash
   );

   if (!isValid) {
      throw new AuthError("Invalid client credentials");
   }

   return {
      success: true,
      message: "Client authenticated successfully",
      data: {
         token: clientServer.client_secret_hash,
         client_id: clientServer.client_id,
         app_name: clientServer.app_name,
      },
   };
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
   registerClientServerForUser,
   getClientServerById,
   getUserClientServer,
   updateUserClientServer,
   deleteUserClientServer,
   updateClientServer,
   deleteClientServerById,
   authenticateClientServer,
};

export default clientServerService;
