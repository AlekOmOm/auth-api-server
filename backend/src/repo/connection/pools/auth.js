/**
 * connection to auth server
 *
 * schema for orchestration of client servers
 *
 * - client_servers table
 */
import { Pool } from "pg";
import config from "../../../config/env.js";
import { ddl } from "../../DDL/auth_internal_complete.js";

// cache
let pool;

const getPool = async () => {
   if (!pool) {
      // Transform config.POSTGRES to match pg Pool constructor expectations
      const pgConfig = {
         host: config.POSTGRES.HOST,
         port: config.POSTGRES.PORT,
         user: config.POSTGRES.USER,
         password: config.POSTGRES.PASSWORD,
         database: config.POSTGRES.DATABASE,
      };

      pool = new Pool(pgConfig);
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
