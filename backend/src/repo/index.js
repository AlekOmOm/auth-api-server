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
import getQueryConfig from "./connection/queries/index.js";
import { fromDB } from "../models/functional/index.js";

// --- REPOSITORY ---
class Repo {
   constructor(schema, tableName) {
      this.schema = schema;
      this.pool = getPool(schema);
      this.tableName = tableName;
   }

   // --- FUNCTIONAL DATABASE OPERATIONS ---
   /**
    * Execute a database operation
    * @param {string} operationName - The operation to execute
    * @param {...any} params - Parameters for the operation
    * @returns {Promise<any>} The result of the operation
    */
   async query(operationName, ...params) {
      const config = getQueryConfig(this.tableName, operationName, ...params);
      // config = { sql, valuesExtractor, inputParams, operationType, logicalTableName }

      let sqlParams = [];
      if (
         config.valuesExtractor &&
         config.inputParams &&
         config.inputParams.length > 0
      ) {
         // inputParams[0] is the instance or data object
         sqlParams = config.valuesExtractor(config.inputParams[0]);
      } else if (config.valuesExtractor) {
         // Handle cases like getAll where there are no inputParams but paramExtractor might be relevant if it was defined differently
         // For now, if valuesExtractor exists, it expects inputParams[0]
         // This branch might indicate an issue if valuesExtractor exists but inputParams is empty
      } // If no valuesExtractor, sqlParams remains [] (e.g. for getAll)

      try {
         const { rows, rowCount } = await this.pool.query(
            config.sql,
            sqlParams
         );

         if (config.operationType === "entity") {
            // For schema operations without logicalTableName, return raw result
            if (!config.logicalTableName) {
               return rows.length ? rows[0] : null;
            }
            return rows.length
               ? fromDB(config.logicalTableName, rows[0])
               : null;
         } else if (config.operationType === "array") {
            // For schema operations without logicalTableName, return raw results
            if (!config.logicalTableName) {
               return rows;
            }
            return rows.map((row) => fromDB(config.logicalTableName, row));
         } else {
            // For 'void' or other types, could return rowCount or raw result
            return { rows, rowCount }; // Default for now
         }
      } catch (error) {
         // console.error("Error executing query:", error, "SQL:", config.sql, "Params:", sqlParams);
         throw error;
      }
   }
}

export default Repo;
