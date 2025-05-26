/**
 * connection to auth server
 *
 * schema for orchestration of client servers
 *
 * - client_servers table
 */
import { Pool } from "pg";
// import config from "../../../utils/config.js"; // This was incorrect
import { ddl } from "../../schemas/auth_internal/client_servers.js";

// cache
let pool;

const getPool = async () => {
   if (!pool) {
      pool = new Pool({
         user: process.env.POSTGRES_USER,
         host: process.env.POSTGRES_HOST,
         database: process.env.POSTGRES_DB, // Use the main POSTGRES_DB
         password: process.env.POSTGRES_PASSWORD,
         port: parseInt(process.env.POSTGRES_PORT, 10),
      });
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
