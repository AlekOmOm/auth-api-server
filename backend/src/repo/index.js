console.log(
   "%%%%%%% TESTING FILE CHANGE IN REPO INDEX.JS - VERSION XYZ %%%%%%%"
);
/**
 * purpose:
 * - schema agnostic
 *   - schemas:
 *     - auth_internal
 *     - custom client schema (getPoolForSchema)
 *
 * - entity agnostic pure function CRUD operations
 *   - entities:
 *     - user
 *     - session
 *     - client_server
 *   - queries linked to entities
 *     -  users (../queries/users.js)
 *     -  sessions (../queries/sessions.js)
 *     -  client_servers (../queries/clientServers.js)
 *
 *
 */

import getPool from "./connection/pools/index.js";
import { operations as allTableOperations } from "./connection/queries/index.js";
import { fromDB } from "../models/functional/index.js";

// --- REPOSITORY ---
class Repo {
   constructor(schema, tableName) {
      this.schema = schema;
      this.table = tableName; // Logical table name, e.g., "client_server", "user"
      this._poolPromise = getPool(this.schema); // Store the promise to the pool
      this.pool = null; // Will be set once the promise resolves

      // Get the specific operations for this table instance
      // Note: The keys in allTableOperations are actual table names like "client_servers"
      this.currentTableOps = allTableOperations[this.table];
      if (!this.currentTableOps) {
         throw new Error(
            `No operations defined for table '${this.table}' in query registry. Check table name and queries/index.js.`
         );
      }
   }

   /**
    * Get the initialized pool, awaiting its creation if necessary.
    * @returns {Promise<import('pg').Pool>} The initialized pg Pool object.
    */
   async getInitializedPool() {
      if (this.pool && typeof this.pool.query === "function") {
         return this.pool;
      }
      this.pool = await this._poolPromise;
      return this.pool;
   }

   /**
    * Executes a predefined SQL query operation.
    * @param {string} operationName - The name of the operation (e.g., 'create', 'findById').
    * @param {Object|Array|string|number} params - Parameters for the SQL query. For operations expecting an instance (like create, update), this is the data object. For others (like get by ID), it can be a single value or an object with properties.
    * @returns {Promise<any>} The result from the database query, transformed by fromDB if applicable.
    * @throws {Error} If the operation is not found or if the query fails.
    */
   async query(operationName, params) {
      const pool = await this.getInitializedPool();
      const operationConfig = this.currentTableOps[operationName];

      if (!operationConfig) {
         throw new Error(
            `Operation '${operationName}' not found for table '${this.table}'. Ensure it's defined in queries/index.js.`
         );
      }

      // Enhanced DEBUG LOGGING for getByUserId on client_servers
      if (this.table === "client_servers" && operationName === "getByUserId") {
         console.log(
            `[REPO_DEBUG] table: ${this.table}, operation: ${operationName}`
         );
         console.log(
            `[REPO_DEBUG] Using schema: "${this.schema}" (type: ${typeof this
               .schema})`
         );
         console.log(
            `[REPO_DEBUG] Received params for ${operationName}:`,
            JSON.stringify(params)
         );
      }
      // END Enhanced DEBUG LOGGING

      const sqlQueryString =
         typeof operationConfig.sql === "function"
            ? operationConfig.sql(this.schema) // Pass schema, not params
            : operationConfig.sql;

      let values;
      if (operationConfig.paramExtractor) {
         values = operationConfig.paramExtractor(params);
      } else {
         if (Array.isArray(params)) {
            values = params;
         } else if (
            params &&
            typeof params === "object" &&
            Object.keys(params).length === 0
         ) {
            // If no extractor, and params is an empty object (e.g., for getAll invoked with {}),
            // assume no query values are needed for the SQL execution.
            values = [];
         } else if (params !== undefined && params !== null) {
            // For single primitive values or non-empty objects that are effectively a single parameter.
            values = [params];
         } else {
            // Default to no parameters if params is undefined or null and not handled above.
            values = [];
         }
      }

      // Further Enhanced DEBUG LOGGING for getByUserId on client_servers
      if (this.table === "client_servers" && operationName === "getByUserId") {
         console.log(
            `[REPO_DEBUG] Extracted values for SQL query:`,
            JSON.stringify(values)
         );
         console.log(
            `[REPO_DEBUG] Full SQL query string for ${this.table}.${operationName}: ${sqlQueryString}`
         );
      }
      // END Further Enhanced DEBUG LOGGING

      try {
         // console.log(
         //    `[Repo:${this.table}] SQL: ${sqlQueryString}`,
         //    "Values:",
         //    values
         // );

         // Added for debugging user creation ID issue
         if (this.table === "users" && operationName === "create") {
            console.log(`[Repo:users:create] Operation: ${operationName}`);
            // Log the raw params object (should be User instance)
            console.log(
               "[Repo:users:create] Received params (User instance):",
               params
            );
            // Log critical properties of the User instance if it exists
            if (params && typeof params === "object") {
               console.log(`[Repo:users:create] params.id: ${params.id}`);
               console.log(`[Repo:users:create] params.name: ${params.name}`);
               console.log(`[Repo:users:create] params.email: ${params.email}`);
            }
            // Log the extracted values for the SQL query
            console.log(
               "[Repo:users:create] Extracted SQL values for query:",
               values
            );
         }

         const result = await pool.query(sqlQueryString, values);

         // Transform results based on operation type
         if (operationConfig.type === "entity") {
            return result.rows.length
               ? fromDB(this.table, result.rows[0])
               : null;
         } else if (operationConfig.type === "array") {
            return result.rows.map((row) => fromDB(this.table, row));
         } else if (operationConfig.type === "void") {
            return; // For operations like delete that don't return data
         }
         return result; // Fallback for other types or if no specific type handling
      } catch (error) {
         console.error(
            `[Repo:${this.table}] Error executing query for operation '${operationName}':`,
            {
               sql: sqlQueryString,
               values,
               error: error.message,
               errorCode: error.code,
               detail: error.detail,
            }
         );
         throw error;
      }
   }

   async getOne(operationName, params) {
      // This method assumes the query operation itself returns a single entity or null.
      // The transformation to a single entity is handled within the main query method.
      return this.query(operationName, params);
   }

   async getMany(operationName, params) {
      // This method assumes the query operation returns an array of entities.
      // The transformation to an array of entities is handled within the main query method.
      return this.query(operationName, params);
   }
}

export default Repo;
