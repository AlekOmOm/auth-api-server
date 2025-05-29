// CRUD operations for client_servers table (Postgres multi-tenant)
/**
 * Repository layer for CRUD clientServer operations
 *
 * Uses request object to resolve appropriate database pool based on session context.
 * This ensures the correct pool (auth_internal for admin/owner, tenant for users)
 * is used automatically.
 */
import { CLIENT_SERVER } from "../../connection/queries/queries.js";
import getPool from "../../connection/pools/auth.js";
import { ClientServer } from "../../models/models.js";

/**
 * Create a new client server
 * @param {ClientServer} clientServer - ClientServer instance
 * @returns {ClientServer} created client server
 */
export const createClientServer = async (clientServer) => {
   const pool = await getPool();
   const { rows } = await pool.query(
      CLIENT_SERVER.create,
      clientServer.toDatabaseArray()
   );
   return ClientServer.fromDb(rows[0]);
};

/**
 * Get client server by ID
 * @param {string} clientId - Client ID
 * @returns {ClientServer|null} client server or null
 */
export const getClientServer = async (clientId) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.get, [clientId]);
   return rows[0] ? ClientServer.fromDb(rows[0]) : null;
};

/**
 * Get client server by referer URL
 * @param {string} url - Referer URL
 * @returns {ClientServer|null} client server or null
 */
export const getClientServerByReferer = async (url) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.getByReferer, [url]);
   return rows[0] ? ClientServer.fromDb(rows[0]) : null;
};

/**
 * Update client server
 * @param {ClientServer} clientServer - ClientServer instance
 * @returns {ClientServer} updated client server
 */
export const updateClientServer = async (clientServer) => {
   const pool = await getPool();
   const { rows } = await pool.query(
      CLIENT_SERVER.update,
      clientServer.toDatabaseArray()
   );
   return ClientServer.fromDb(rows[0]);
};

/**
 * Delete client server
 * @param {string} clientId - Client ID
 * @returns {ClientServer} deleted client server
 */
export const deleteClientServer = async (clientId) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.delete, [clientId]);
   return ClientServer.fromDb(rows[0]);
};

/**
 * Get all client servers for a user
 * @param {string} userId - User ID
 * @returns {ClientServer[]} client servers for user
 */
export const getClientServersByUserId = async (userId) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.getByUserId, [userId]);
   return ClientServer.fromDbRows(rows);
};

/**
 * Get specific client server for a user
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {ClientServer|null} client server or null
 */
export const getClientServerByUserIdAndClientId = async (userId, clientId) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.getByUserIdAndClientId, [
      userId,
      clientId,
   ]);
   return rows[0] ? ClientServer.fromDb(rows[0]) : null;
};

/**
 * Get client server by secret hash
 * @param {string} secretHash - Secret hash
 * @returns {ClientServer|null} client server or null
 */
export const getClientServerBySecretHash = async (secretHash) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.getBySecretHash, [
      secretHash,
   ]);

   return rows[0] ? ClientServer.fromDb(rows[0]) : null;
};

/**
 * Delete client server for a user
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {ClientServer} deleted client server
 */
export const deleteClientServerByUserIdAndClientId = async (
   userId,
   clientId
) => {
   const pool = await getPool();
   const { rows } = await pool.query(CLIENT_SERVER.deleteByUserIdAndClientId, [
      userId,
      clientId,
   ]);
   return ClientServer.fromDb(rows[0]);
};

export default {
   createClientServer,
   getClientServer,
   updateClientServer,
   deleteClientServer,
   getClientServersByUserId,
   getClientServerByUserIdAndClientId,
   getClientServerBySecretHash,
   deleteClientServerByUserIdAndClientId,
};
