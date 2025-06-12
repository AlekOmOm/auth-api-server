// --- imports ---
import Repo from "../repo/index.js";
import { Session, SessionOperations } from "../models/index.js";

// --- Pipeline Pattern Components ---

const TABLE = "sessions";
const repo = (schema) => new Repo(schema, TABLE);
const repoQuery = (schema, operationName) => (instance) =>
   repo(schema).query(operationName, instance);

/**
 * Pipeline function for service operations.
 * @param {class} model - The model class (e.g., Session).
 * @param {function} executor - The repoQuery function prepared for execution.
 * @param {string} successMessage - Success message.
 * @param  {...any} args - Arguments for model.fromRequestBody.
 */
const pipeline = async (model, executor, successMessage, ...args) => {
   try {
      const instance = await model.fromRequestBody(...args);
      const data = await executor(instance);
      // Check if repo query indicated an error or returned null for "not found"
      // For session creation, null data might not be an error if the query doesn't return the created session for some reason, but usually it should.
      // However, if data.error is present, it's definitely an error from the repo layer.
      if (data === null || (typeof data === "object" && data.error)) {
         return {
            success: false,
            error:
               data?.error ||
               new Error("Session operation failed or resource not found."),
            message:
               data?.message ||
               "Failed to execute repository operation for session or resource not found.",
         };
      }
      return {
         success: true,
         data: data,
         message: successMessage,
      };
   } catch (error) {
      // Log the error with more context if possible
      const operationName = executor.operationName || "unknown"; // Assuming executor can have an operationName for logging
      console.error(
         `Error in sessionService pipeline for ${model.name} (operation: ${operationName}):`,
         error
      );
      return {
         success: false,
         error: error,
         message:
            error.message ||
            `Operation failed in ${model.name} service pipeline.`,
      };
   }
};

// ---- Service Functions ----
/**
 * CRUD
      create, 
      getAll,
      get,
      update,
      deleteByID,
      deleteAll,
      getByUserId,
      getById, // session id
      deleteByUserId,
      deleteById,
      deleteExpired,
 */

// --- service functions ---

/**
 * Create a new session
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID
 * @param {string} params.schema - Database schema
 * @returns {Object} New session
 */
export async function create({
   userId,
   ipAddress = null,
   userAgent = null,
   schema,
}) {
   const input = { userId, ipAddress, userAgent };

   return await pipeline(
      Session,
      repoQuery(schema, "create"),
      "Session created successfully",
      input
   );
}

/**
 * Get all sessions
 * @param {Object} params - Parameters object
 * @param {string} params.schema - Database schema
 * @returns {Object} All sessions
 */
export async function getAll({ userId = null, schema }) {
   if (userId) {
      return await pipeline(
         Session,
         repoQuery(schema, "getByUserId"),
         "Sessions retrieved successfully",
         { userId }
      );
   }
   return await pipeline(
      Session,
      repoQuery(schema, "getAll"),
      "Sessions retrieved successfully",
      {}
   );
}

/**
 * Get a session by ID
 * @param {Object} params - Parameters object
 * @param {string} params.sessionId - Session ID
 * @param {string} params.schema - Database schema
 * @returns {Object} Session
 */
export async function getById({ sessionId, schema }) {
   return await pipeline(
      Session,
      repoQuery(schema, "get"),
      "Session retrieved successfully",
      { sessionId }
   );
}

/**
 * Get a session by user ID
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID
 * @param {string} params.schema - Database schema
 * @returns {Object} Session
 */
export async function getByUserId({ userId, schema }) {
   return await pipeline(
      Session,
      repoQuery(schema, "getByUserId"),
      "Sessions retrieved successfully",
      { userId }
   );
}

/**
 * Update a session
 * @param {Object} params - Parameters object
 * @param {string} params.sessionId - Session ID
 * @param {string} params.schema - Database schema
 * @returns {Object} Updated session
 */
export async function update({ sessionId, expiresAt = null, schema }) {
   const expiry =
      expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
   const input = { sessionId, expiresAt: expiry };
   return await pipeline(
      Session,
      repoQuery(schema, "update"),
      "Session updated successfully",
      input
   );
}

/**
 * deleteSession
 * flow:
 * 1. deleteById or deleteByUserId
 * 2. delete session from request
 * 3. return success message
 *
 *
 * @param {Object} params - Parameters object
 * @param {string} params.sessionId - Session ID
 * @param {string} params.userId - User ID
 * @param {string} params.schema - Database schema
 * @requires sessionId || userId
 * @requires schema
 * @returns {Object} Deleted session
 */
export async function deleteSession({ sessionId, userId, schema }) {
   if (sessionId !== null) {
      return await deleteById({ sessionId, schema });
   }
   return await deleteByUserId({ userId, schema });
}

/**
 * Delete a session by ID
 * @param {Object} params - Parameters object
 * @param {string} params.sessionId - Session ID
 * @param {string} params.schema - Database schema
 * @returns {Object} Deleted session
 */
export async function deleteById({ sessionId, schema }) {
   return await pipeline(
      Session,
      repoQuery(schema, "deleteById"),
      "Session deleted successfully",
      { sessionId }
   );
}

/**
 * Delete all sessions
 * @param {Object} params - Parameters object
 * @param {string} params.schema - Database schema
 * @returns {Object} Deleted sessions
 */
export async function deleteAll({ schema }) {
   const result = await repo(schema).query("deleteAll");
   return { message: "All sessions deleted successfully", data: result };
}

/**
 * Delete a session by user ID
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID
 * @param {string} params.schema - Database schema
 * @returns {Object} Deleted sessions
 */
export async function deleteByUserId({ userId, schema }) {
   return await pipeline(
      Session,
      repoQuery(schema, "deleteByUserId"),
      "Sessions deleted successfully",
      { userId }
   );
}

/**
 * Delete expired sessions
 * @param {Object} params - Parameters object
 * @param {string} params.schema - Database schema
 * @returns {Object} Deleted sessions
 */
export async function deleteExpired({ schema }) {
   const result = await repo(schema).query("deleteExpired");
   return { message: "Expired sessions deleted successfully", data: result };
}

// Legacy wrapper: derive sessionId from provided sessionData or direct param
export async function get({
   sessionData = {},
   sessionId = null,
   schema = null,
}) {
   const derivedSessionId = sessionId || sessionData?.sessionId;
   const derivedSchema = schema || sessionData?.schema;

   if (!derivedSessionId) {
      throw new Error("sessionId is required");
   }

   return await getById({ sessionId: derivedSessionId, schema: derivedSchema });
}

// --- export ---
export { deleteById as deleteByID };

export default {
   create,
   getAll,
   getById,
   get,
   getByUserId,
   update,
   deleteById,
   deleteAll,
   deleteByUserId,
   deleteExpired,
   deleteSession,
};
