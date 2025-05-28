import { Pool } from "pg";
import config from "../../../config/env.js";
import { ddl } from "../../schemas/client_servers/client_server_template.js";

// Cache
const schemas = {};

/**
 * Returns a pg.Pool connected to the given schema (creates it on first use).
 * Example:
 *   const pool = await getPoolForSchema("acme_corp");
 *   const { rows } = await pool.query("SELECT * FROM users");
 */
export const getPoolForSchema = async (schemaName = "client_template") => {
   if (schemas[schemaName]) {
      return schemas[schemaName];
   }

   // Transform config.POSTGRES to match pg Pool constructor expectations
   const pgConfig = {
      host: config.POSTGRES.HOST,
      port: config.POSTGRES.PORT,
      user: config.POSTGRES.USER,
      password: config.POSTGRES.PASSWORD,
      database: config.POSTGRES.DATABASE,
   };

   const localPool = new Pool(pgConfig);
   await localPool.connect();
   await initSchema(localPool, schemaName);
   schemas[schemaName] = localPool;
   await localPool.query(`set search_path to ${schemaName}, public`);
   return localPool;
};

/**
 * init schema
 * - create schema if not exists
 * - modify sql to use schemaName
 * - execute statements
 */
const initSchema = async (currentPool, schemaName) => {
   await currentPool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName};`);
   if (schemaName === "client_template") {
      return;
   }
   const statements = ddl(schemaName);
   for (const stmt of statements) {
      await currentPool.query(stmt);
   }
};

export default getPoolForSchema;
