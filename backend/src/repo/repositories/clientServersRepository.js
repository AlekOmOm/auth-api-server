// CRUD operations for client_servers table (Postgres multi-tenant)
/**
 * Repository layer for client_servers operations
 *
 * Uses request object to resolve appropriate database pool based on session context.
 * This ensures the correct pool (auth_internal for admin/owner, tenant for users)
 * is used automatically.
 */
import * as queries from "../connection/queries.js";
import { getPoolForRequest } from "../../services/poolService.js";

/**
 * Create a new client server
 * @param {Object} req - Express request object with session context
 * @param {Object} clientServer - client server data
 * @returns {Object} created client server
 */
export const createClientServer = async (req, clientServer) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(queries.createClientServer, [
      clientServer.client_id,
      clientServer.client_secret_hash,
      clientServer.app_name,
      clientServer.assigned_schema_name,
      clientServer.allowed_return_urls,
      clientServer.user_id,
      clientServer.client_mode,
   ]);
   return rows[0];
};

/**
 * Get client server by ID
 * @param {Object} req - Express request object with session context
 * @param {string} clientId - Client ID
 * @returns {Object} client server or null
 */
export const getClientServer = async (req, clientId) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(queries.getClientServer, [clientId]);
   return rows[0];
};

/**
 * Update client server
 * @param {Object} req - Express request object with session context
 * @param {Object} clientServer - client server data
 * @returns {Object} updated client server
 */
export const updateClientServer = async (req, clientServer) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(queries.updateClientServer, [
      clientServer.client_id,
      clientServer.client_secret_hash,
      clientServer.app_name,
      clientServer.assigned_schema_name,
      clientServer.allowed_return_urls,
      clientServer.client_mode,
   ]);
   return rows[0];
};

/**
 * Delete client server
 * @param {Object} req - Express request object with session context
 * @param {string} clientId - Client ID
 * @returns {Object} deleted client server
 */
export const deleteClientServer = async (req, clientId) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(queries.deleteClientServer, [clientId]);
   return rows[0];
};

/**
 * Get all client servers for a user
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID
 * @returns {Array} client servers for user
 */
export const getClientServersByUserId = async (req, userId) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(queries.getClientServersByUserId, [
      userId,
   ]);
   return rows;
};

/**
 * Get specific client server for a user
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {Object} client server or null
 */
export const getClientServerByUserIdAndClientId = async (
   req,
   userId,
   clientId
) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(
      queries.getClientServerByUserIdAndClientId,
      [userId, clientId]
   );
   return rows[0];
};

/**
 * Delete client server for a user
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {Object} deleted client server
 */
export const deleteClientServerByUserIdAndClientId = async (
   req,
   userId,
   clientId
) => {
   const pool = await getPoolForRequest(req);
   const { rows } = await pool.query(
      queries.deleteClientServerByUserIdAndClientId,
      [userId, clientId]
   );
   return rows[0];
};

/**
 * Legacy methods for backward compatibility (when pool is explicitly provided)
 * These should be phased out in favor of request-based methods above
 */

export const createClientServerWithPool = async (pool, clientServer) => {
   const { rows } = await pool.query(queries.createClientServer, [
      clientServer.client_id,
      clientServer.client_secret_hash,
      clientServer.app_name,
      clientServer.assigned_schema_name,
      clientServer.allowed_return_urls,
      clientServer.user_id,
      clientServer.client_mode,
   ]);
   return rows[0];
};

export const getClientServerWithPool = async (pool, clientId) => {
   const { rows } = await pool.query(queries.getClientServer, [clientId]);
   return rows[0];
};

export const updateClientServerWithPool = async (pool, clientServer) => {
   const { rows } = await pool.query(queries.updateClientServer, [
      clientServer.client_id,
      clientServer.client_secret_hash,
      clientServer.app_name,
      clientServer.assigned_schema_name,
      clientServer.allowed_return_urls,
      clientServer.client_mode,
   ]);
   return rows[0];
};

export const deleteClientServerWithPool = async (pool, clientId) => {
   const { rows } = await pool.query(queries.deleteClientServer, [clientId]);
   return rows[0];
};

export default {
   // New request-based methods (preferred)
   createClientServer,
   getClientServer,
   updateClientServer,
   deleteClientServer,
   getClientServersByUserId,
   getClientServerByUserIdAndClientId,
   deleteClientServerByUserIdAndClientId,

   // Legacy pool-based methods (for backward compatibility)
   createClientServerWithPool,
   getClientServerWithPool,
   updateClientServerWithPool,
   deleteClientServerWithPool,
};
