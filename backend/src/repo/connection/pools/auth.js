/**
 * connection to auth server
 *
 * schema for orchestration of client servers
 *
 * - client_servers table
 */
import { Pool } from "pg";
import config from "../../../utils/config.js";
import { ddl } from "../../schemas/auth_internal/client_servers.js";

// cache
let pool;

const getPool = async () => {
   if (!pool) {
      pool = new Pool(config.postgres);
      await pool.connect();
      await initSchema();
   }

   return pool;
};

async function initSchema() {
   const statements = ddl();
   for (const stmt of statements) {
      await pool.query(stmt);
   }
}

export default getPool;
