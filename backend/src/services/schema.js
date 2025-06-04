import { Schema } from "../models/index.js";
import Repo from "../repo/index.js";

/**
 * Service layer for Schema operations following pipeline pattern
 *
 * Different operations work with different schemas:
 * - System operations: Query PostgreSQL system catalogs
 * - Tenant operations: Work within specific tenant schemas
 * - Assignment operations: Use auth_internal schema
 */

// --- Pipeline functions for different schema types ---

const systemRepo = () => new Repo("information_schema", "schemata");
const tenantRepo = (schemaName) => new Repo(schemaName, "users");
const authRepo = () => new Repo("auth_internal", "client_servers");

const systemQuery = (operationName) => (instance) =>
   systemRepo().query(operationName, instance);

const tenantQuery = (schemaName, operationName) => (instance) =>
   tenantRepo(schemaName).query(operationName, instance);

const authQuery = (operationName) => (instance) =>
   authRepo().query(operationName, instance);

/**
 * pipeline function
 * @param {*} modelClass - model class
 * @param {*} executor - prepared query executor
 * @param {*} message - success message
 * @param  {...any} args - arguments for fromRequestBody
 * @returns {Object} { message, data }
 */
const pipeline = async (modelClass, executor, message, ...args) => {
   const instance = await modelClass.fromRequestBody(...args);
   const result = await executor(instance);
   return {
      message: message,
      data: result,
   };
};

// --- Service functions ---

/**
 * Check if a schema exists (READ)
 * Uses PostgreSQL system catalogs
 */
export async function checkExists({ schemaName }) {
   const result = await pipeline(
      Schema,
      systemQuery("checkSchemaExists"),
      "Schema existence checked successfully",
      { schema: schemaName }
   );

   return {
      message: result.message,
      data: {
         exists: result.data !== null,
         schemaName: schemaName,
      },
   };
}

/**
 * Get all tenant schemas (READ - list)
 * Uses PostgreSQL system catalogs
 */
export async function getAllTenantSchemas() {
   return await pipeline(
      Schema,
      systemQuery("getAllTenantSchemas"),
      "Tenant schemas retrieved successfully"
   );
}

/**
 * Get tenant schema statistics (READ)
 * @param {Schema} schema - Schema instance
 * @returns {Object} { message, data: { schemaName, userCount, activeSessionCount, tables } }
 */
export async function getTenantStats({ schema }) {
   schema.validate();
   if (!schema.isTenantSchema()) {
      throw new Error("Invalid tenant schema name");
   }

   // Get user count from tenant schema
   const userStats = await pipeline(
      Schema,
      tenantQuery(schema.name, "getAll"),
      "Tenant user stats retrieved successfully",
      { schema: schema.name }
   );

   // Get session count from tenant schema
   const sessionRepo = new Repo(schema.name, "sessions");
   const activeSessions = await sessionRepo.query("getActiveSessions");

   return {
      message: "Tenant schema statistics retrieved successfully",
      data: {
         schemaName: schema.name,
         userCount: Array.isArray(userStats.data) ? userStats.data.length : 0,
         activeSessionCount: Array.isArray(activeSessions)
            ? activeSessions.length
            : 0,
         tables: ["users", "sessions"],
      },
   }
}

/**
 * Get client info for a schema (READ)
 * Queries auth_internal.client_servers table
 */
export async function getClientBySchema({ schema }) {
   return await pipeline(
      Schema,
      authQuery("getByAssignedSchema"),
      "Client info retrieved successfully",
      { schema: schema.name }
   );
}

/**
 * Assign schema to client server (UPDATE)
 * Updates auth_internal.client_servers table
 */
export async function assignToClient({ clientId, schema }) {
   return await pipeline(
      Schema,
      authQuery("assignSchemaToClient"),
      "Schema assigned to client successfully",
      { clientId, schema: schema.name }
   );
}

/**
 * Unassign schema from client server (UPDATE)
 * Updates auth_internal.client_servers table
 */
export async function unassignFromClient({ clientId, schema }) {
   return await pipeline(
      Schema,
      authQuery("unassignSchemaFromClient"),
      "Schema unassigned from client successfully",
      { clientId, schema: schema.name }
   );
}

export const schemaService = {
   checkExists,
   getAllTenantSchemas,
   getTenantStats,
   getClientBySchema,
   assignToClient,
   unassignFromClient,
};

export default schemaService;
