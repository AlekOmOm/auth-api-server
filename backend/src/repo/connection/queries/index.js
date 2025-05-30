import { toDB, fromDB } from "../../../models/functional/index.js";
import * as clientServer from "./clientServer.js";
import * as session from "./session.js";
import * as user from "./user.js";
import getTableDefault, { TABLES } from "../TABLES.js";

// Use the 'get' function from the default export
const getTable = getTableDefault.get;

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
   },
   [getTable("user")]: {
      create: user.create,
      createUsers: user.createUsers,
      getAll: user.getAll,
      get: user.get,
      update: user.update,
      deleteByID: user.deleteByID,
      deleteAll: user.deleteAll,
      getByEmail: user.getByEmail,
   },
   [getTable("session")]: {
      create: session.create,
      getAll: session.getAll,
      get: session.get,
      update: session.update,
      deleteByID: session.deleteById,
      deleteAll: session.deleteAll,
      getByUserId: session.getByUserId,
      getById: session.getById, // session id
      deleteByUserId: session.deleteByUserId,
      deleteById: session.deleteById,
      deleteExpired: session.deleteExpired,
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

/**
 * Pure query function - handles all database operations
 * @param {string} table - Table name ('client_server', 'user', 'session')
 * @param {string} operation - Operation name ('create', 'get', 'getAll', etc.)
 * @param {...any} params - Parameters for the operation
 * @returns {any} Query result (transformed if needed)
 */
const query = (table, operation, ...params) => {
   const logicalTableName = Object.keys(TABLES).find(
      (key) => TABLES[key] === table
   );
   if (!logicalTableName || !operations[getTable(logicalTableName)]) {
      throw new Error(`Table '${table}' not found or no operations defined.`);
   }
   const operationConfig = operations[getTable(logicalTableName)][operation];
   if (!operationConfig) {
      throw new Error(
         `Operation '${operation}' not found for table '${table}'.`
      );
   }

   let processedParams = params;
   if (inputOps.includes(operation) && params.length > 0 && params[0]) {
      processedParams = [toDB(logicalTableName, params[0]), ...params.slice(1)];
   }
   // For non-inputOps (like getters), params[0] is often the instance with lookup fields.

   return {
      sql: operationConfig.sql,
      valuesExtractor: operationConfig.paramExtractor, // Function to get SQL values from processedParams[0]
      inputParams: processedParams, // The (potentially toDB transformed) params as passed by Repo
      operationType: operationConfig.type, // 'entity', 'array', or 'void'/'rowCount'
      logicalTableName: logicalTableName,
   };
};

export default query;
