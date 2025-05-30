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
import query from "./connection/queries/index.js";

// --- REPOSITORY ---
class Repo {
   constructor(schema, tableName) {
      this.schema = schema;
      this.pool = getPool(schema);
      this.tableName = tableName;
   }

   // --- FUNCTIONAL DATABASE OPERATIONS ---
   query(operation, ...params) {
      return query(this.tableName, operation, ...params);
   }
}

export default Repo;
