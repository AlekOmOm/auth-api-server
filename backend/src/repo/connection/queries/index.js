import { toDB, fromDB } from "../../../models/functional/index.js";
import clientServer from "./clientServer.js";
import session from "./session.js";
import user from "./user.js";
import getTable from "./TABLES.js";

// Query operations registry
const operations = {
   [getTable.get("client_servers")]: {
      create: clientServer.create,
      getAll: clientServer.getAll,
      get: clientServer.get,
      update: clientServer.update,
      delete: clientServer.delete,
      deleteAll: clientServer.deleteAll,
      getBySecretHash: clientServer.getBySecretHash,
      getByReferer: clientServer.getByReferer,
      getByUserId: clientServer.getByUserId,
      getByUserIdAndClientId: clientServer.getByUserIdAndClientId,
   },
   [getTable.get("users")]: {
      create: user.create,
      getAll: user.getAll,
      get: user.get,
      update: user.update,
      delete: user.delete,
      getByEmail: user.getByEmail,
   },
   [getTable.get("sessions")]: {
      create: session.create,
      getAll: session.getAll,
      get: session.get,
      update: session.update,
      delete: session.delete,
      deleteAll: session.deleteAll,
      getByUserId: session.getByUserId,
      getBySessionId: session.getBySessionId,
      deleteByUserId: session.deleteByUserId,
      deleteBySessionId: session.deleteBySessionId,
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
   // Validate table
   if (!operations[table]) {
      throw new Error(`Table '${table}' not found`);
   }

   // Validate operation
   if (!operations[table][operation]) {
      throw new Error(
         `Operation '${operation}' not found for table '${table}'`
      );
   }

   // Get the query function
   const queryFn = operations[table][operation];

   // Transform input data if needed
   let transformedParams = params;
   if (inputOps.includes(operation) && params.length > 0) {
      transformedParams = [toDB(table, params[0]), ...params.slice(1)];
   }

   // Execute query
   const result = queryFn(...transformedParams);

   // Transform output data if needed
   if (arrayOps.includes(operation) && Array.isArray(result)) {
      return result.map((entity) => fromDB(table, entity));
   }

   if (entityOps.includes(operation) && result) {
      return fromDB(table, result);
   }

   // Return as-is for other operations (delete, deleteAll, etc.)
   return result;
};

export default query;
