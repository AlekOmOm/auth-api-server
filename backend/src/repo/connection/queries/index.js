import { toDB, fromDB } from "../../../models/functional/index.js";
import * as clientServer from "./clientServer.js";
import * as session from "./session.js";
import * as user from "./user.js";
import * as schema from "./schema.js";
import getTableDefault, { TABLES } from "../TABLES.js";
const getTable = getTableDefault.get;

// --- query functions ---
/**
 * Pure query function - handles all database operations
 * @param {string} table - Table name ('client_server', 'user', 'session', 'schema')
 * @param {string} operation - Operation name ('create', 'get', 'getAll', etc.)
 * @param {...any} params - Parameters for the operation
 * @returns {any} Query result (transformed if needed)
 */
const query = (table, operation, ...params) => {
   // schema operations (not a real table)
   if (table === "schema") {
      return configSchema(operation, ...params);
   }

   // table operations
   return configTable(table, operation, ...params);
};

// --- ---

// Query operations registry
export const operations = {
   [getTable("client_server")]: {
      create: {
         sql: clientServer.create,
         type: "entity",
         paramExtractor: (data) => [
            data.client_id,
            data.client_secret_hash,
            data.app_name,
            data.assigned_schema_name,
            data.identifier_url,
            data.entry_point_url,
            data.authorized_urls,
            data.user_id,
            data.client_mode,
         ],
      },
      getByReferer: {
         sql: clientServer.getByReferer,
         type: "entity",
         paramExtractor: (instance) => [instance.identifier_url],
      },
      get: {
         sql: clientServer.get,
         type: "entity",
         paramExtractor: (instance) => [instance.client_id],
      },
      getAll: { sql: clientServer.getAll, type: "array" },
      getByUserId: {
         sql: clientServer.getByUserId,
         type: "array",
         paramExtractor: (instance) => [instance.user_id],
      },
      getByUserIdAndClientId: {
         sql: clientServer.getByUserIdAndClientId,
         type: "entity",
         paramExtractor: (instance) => [instance.user_id, instance.client_id],
      },
      update: {
         sql: clientServer.update,
         type: "entity",
         paramExtractor: (data) => [
            data.client_id,
            data.client_secret_hash,
            data.app_name,
            data.assigned_schema_name,
            data.identifier_url,
            data.entry_point_url,
            data.authorized_urls,
            data.user_id,
            data.client_mode,
         ],
      },
      deleteByUserIdAndClientId: {
         sql: clientServer.deleteByUserIdAndClientId,
         type: "entity",
         paramExtractor: (instance) => [instance.user_id, instance.client_id],
      },
      getBySecretHash: {
         sql: clientServer.getBySecretHash,
         type: "entity",
         paramExtractor: (instance) => [instance.secret_hash],
      },
      getAllowedUrls: {
         sql: clientServer.getAllowedUrls,
         type: "entity",
         paramExtractor: (instance) => [instance.user_id],
      },
   },
   [getTable("user")]: {
      create: {
         sql: user.create,
         type: "entity",
         paramExtractor: (data) => [
            data.id,
            data.name,
            data.role,
            data.email,
            data.password_hash,
         ],
      },
      createUsers: {
         sql: user.createUsers,
         type: "array",
         paramExtractor: (users) => users,
      },
      getAll: {
         sql: user.getAll,
         type: "array",
      },
      get: {
         sql: user.get,
         type: "entity",
         paramExtractor: (instance) => [instance.id],
      },
      update: {
         sql: user.update,
         type: "entity",
         paramExtractor: (data) => [
            data.name,
            data.role,
            data.email,
            data.password_hash,
            data.id,
         ],
      },
      deleteByID: {
         sql: user.deleteByID,
         type: "void",
         paramExtractor: (instance) => [instance.id],
      },
      deleteAll: {
         sql: user.deleteAll,
         type: "void",
      },
      getByEmail: {
         sql: user.getByEmail,
         type: "entity",
         paramExtractor: (instance) => [instance.email],
      },
   },
   [getTable("session")]: {
      create: {
         sql: session.create,
         type: "entity",
         paramExtractor: (data) => [
            data.user_id,
            data.session_id,
            data.ip_address,
            data.user_agent,
            data.expires_at,
         ],
      },
      getAll: { sql: session.getAll, type: "array" },
      get: {
         sql: session.get,
         type: "entity",
         paramExtractor: (instance) => [
            instance.session_id || instance.sessionId,
         ],
      },
      update: {
         sql: session.update,
         type: "void",
         paramExtractor: (data) => [
            data.expires_at || data.expiresAt,
            data.session_id || data.sessionId,
         ],
      },
      deleteByID: {
         sql: session.deleteById,
         type: "void",
         paramExtractor: (instance) => [
            instance.session_id || instance.sessionId,
         ],
      },
      deleteAll: { sql: session.deleteAll, type: "void" },
      getByUserId: {
         sql: session.getByUserId,
         type: "array",
         paramExtractor: (instance) => [instance.user_id || instance.userId],
      },
      getById: {
         sql: session.getById,
         type: "entity",
         paramExtractor: (instance) => [instance.id],
      },
      deleteByUserId: {
         sql: session.deleteByUserId,
         type: "void",
         paramExtractor: (instance) => [instance.user_id || instance.userId],
      },
      deleteById: {
         sql: session.deleteById,
         type: "void",
         paramExtractor: (instance) => [
            instance.session_id || instance.sessionId,
         ],
      },
      deleteExpired: { sql: session.deleteExpired, type: "void" },
   },
   schema: {
      exists: {
         sql: schema.checkSchemaExists,
         type: "entity",
         paramExtractor: (data) => [data.schemaName],
      },
      listNonSystemSchemas: {
         sql: schema.listNonSystemSchemas,
         type: "array",
      },
      getClientInfoBySchema: {
         sql: schema.getClientInfoBySchema,
         type: "entity",
         paramExtractor: (data) => [data.schemaName],
      },
      getSchemaTableInfo: {
         sql: schema.getSchemaTableInfo,
         type: "array",
         paramExtractor: (data) => [data.schemaName],
      },
   },
};

// Operations that need toDB transformation (input data)
const inputOps = ["create", "update"];

// Operations that return arrays (need fromDB transformation for each item)
const arrayOps = ["getAll", "getByUserId", "getByReferer"];

// Operations that return single entities (need fromDB transformation)
const entityOps = [
   "get",
   "getByEmail",
   "getBySessionId",
   "getByUserIdAndClientId",
];

// --- config functions ---
/**
 * Configures a schema operation
 * @param {string} operation - Operation name
 * @param {...any} params - Parameters for the operation
 * @returns {Object} Config object for the operation
 */
const configSchema = (operation, ...params) => {
   const operationConfig = operations.schema[operation];
   if (!operationConfig) {
      throw new Error(
         `Operation '${operation}' not found for schema operations.`
      );
   }

   return {
      sql: operationConfig.sql,
      valuesExtractor: operationConfig.paramExtractor,
      inputParams: params,
      operationType: operationConfig.type,
      logicalTableName: null, // Schema operations don't map to a table
   };
};

/**
 * Configures a table operation
 * @param {string} table - Table name
 * @param {string} operation - Operation name
 * @param {...any} params - Parameters for the operation
 * @returns {Object} Config object for the operation
 */
const configTable = (table, operation, ...params) => {
   const logicalTableName = getTableName(table);
   const operationConfig = getOperationConfig(logicalTableName, operation);

   let processedParams = getProcessedParams(operation, params);

   return {
      sql: operationConfig.sql,
      valuesExtractor: operationConfig.paramExtractor,
      inputParams: processedParams,
      operationType: operationConfig.type,
      logicalTableName: logicalTableName,
   };
};

// --- helper functions ---

/**
 * Gets the logical table name for a given table
 * @param {string} table - Table name
 * @returns {string} Logical table name
 */
const getTableName = (table) => {
   const logicalTableName = Object.keys(TABLES).find(
      (key) => TABLES[key] === table
   );
   if (!logicalTableName || !operations[getTable(logicalTableName)]) {
      throw new Error(`Table '${table}' not found or no operations defined.`);
   }
   return logicalTableName;
};

/**
 * Gets the operation config for a given operation
 * @param {string} logicalTableName - Logical table name
 * @param {string} operation - Operation name
 * @returns {Object} Operation config
 */
const getOperationConfig = (logicalTableName, operation) => {
   const operationConfig = operations[getTable(logicalTableName)][operation];
   if (!operationConfig) {
      throw new Error(
         `Operation '${operation}' not found for table '${table}'.`
      );
   }
   return operationConfig;
};

/**
 * Gets the processed parameters for a given operation
 * @param {string} operation - Operation name
 * @param {...any} params - Parameters for the operation
 * @returns {any} Processed parameters
 */
const getProcessedParams = (operation, params) => {
   let processedParams = params;
   if (inputOps.includes(operation) && params.length > 0 && params[0]) {
      processedParams = [toDB(logicalTableName, params[0]), ...params.slice(1)];
   }
   return processedParams;
};

export default query;
