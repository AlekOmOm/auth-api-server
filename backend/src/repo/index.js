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

   async querySchema(operationName, ...params) {
      const config = getQueryConfig.schema()
   }
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
         sqlParams = config.valuesExtractor(config.inputParams[0]);
      }

      try {
         const { rows, rowCount } = await this.pool.query(
            config.sql,
            sqlParams
         );

         if (config.operationType === "entity") {
            if (!config.logicalTableName) {
               return rows.length ? rows[0] : null;
            }
            return rows.length
               ? fromDB(config.logicalTableName, rows[0])
               : null;
         } else if (config.operationType === "array") {
            if (!config.logicalTableName) {
               return rows;
            }
            return rows.map((row) => fromDB(config.logicalTableName, row));
         } else {
            return { rows, rowCount }; // Default for now
         }
      } catch (error) {
         throw error;
      }
   }
}

export default Repo;
