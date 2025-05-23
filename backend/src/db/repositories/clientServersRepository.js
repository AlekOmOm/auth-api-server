// CRUD operations for client_servers table (Postgres multi-tenant)
/**
 *  admin only
 *  or client server itself
 */
import * as queries from "../connection/queries.js";

export const createClientServer = async (pool, clientServer) => {
   const { rows } = await pool.query(queries.createClientServer, [
      clientServer.client_id,
      clientServer.client_secret_hash,
      clientServer.app_name,
      clientServer.assigned_schema_name,
      clientServer.allowed_return_urls,
   ]);
   return rows[0];
};


export const getClientServer = async (pool, clientId) => {
   const { rows } = await pool.query(queries.getClientServer, [clientId]);
   return rows[0];
};

export const updateClientServer = async (pool, clientServer) => {
   const { rows } = await pool.query(queries.updateClientServer, [
      clientServer.client_id,
      clientServer.client_secret_hash,
      clientServer.app_name,
      clientServer.assigned_schema_name,
      clientServer.allowed_return_urls,
   ]);
   return rows[0];
};

export const deleteClientServer = async (pool, clientId) => {
   await pool.query(queries.deleteClientServer, [clientId]);
};

export default {
   createClientServer,
   getClientServer,
   updateClientServer,
   deleteClientServer,
};
