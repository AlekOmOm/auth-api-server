// Main repository module that combines user and session repositories
import getPool from "./connection/auth.js";
import {
   createClientServer as createClientServerQuery,
   getClientServer as getClientServerQuery,
   getClientServerByClientSecretHash as getClientServerByClientSecretHashQuery,
   updateClientServer as updateClientServerQuery,
   deleteClientServer as deleteClientServerQuery,
} from "./connection/queries.js";

/**
 * CRUD operations for client servers
 * Repository layer for auth_internal.client_servers table
 */

/**
 * Create a new client server
 * @param {Object} clientServerData - Client server data
 * @returns {Object} Created client server
 */
export const createClientServer = async (clientServerData) => {
   const pool = await getPool();

   const {
      client_id,
      client_secret_hash,
      app_name,
      assigned_schema_name,
      allowed_return_urls,
   } = clientServerData;

   if (
      !client_id ||
      !client_secret_hash ||
      !app_name ||
      !assigned_schema_name ||
      !allowed_return_urls
   ) {
      throw new Error("All client server fields are required");
   }

   const result = await pool.query(createClientServerQuery, [
      client_id,
      client_secret_hash,
      app_name,
      assigned_schema_name,
      allowed_return_urls,
   ]);

   return result.rows[0];
};

/**
 * Get client server by client_id
 * @param {string} clientId - Client ID
 * @returns {Object|null} Client server or null if not found
 */
export const getClientServerByClientId = async (clientId) => {
   const pool = await getPool();

   if (!clientId) {
      throw new Error("Client ID is required");
   }

   const result = await pool.query(getClientServerQuery, [clientId]);
   return result.rows[0] || null;
};

/**
 * Get client server by client secret hash
 * @param {string} clientSecretHash - Client secret hash
 * @returns {Object|null} Client server or null if not found
 */
export const getClientServerByClientSecretHash = async (clientSecretHash) => {
   const pool = await getPool();

   if (!clientSecretHash) {
      throw new Error("Client secret hash is required");
   }

   const result = await pool.query(getClientServerByClientSecretHashQuery, [
      clientSecretHash,
   ]);
   return result.rows[0] || null;
};

/**
 * Update client server
 * @param {string} clientId - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated client server
 */
export const updateClientServer = async (clientId, updateData) => {
   const pool = await getPool();

   if (!clientId) {
      throw new Error("Client ID is required");
   }

   const {
      client_secret_hash,
      app_name,
      assigned_schema_name,
      allowed_return_urls,
   } = updateData;

   const result = await pool.query(updateClientServerQuery, [
      clientId,
      client_secret_hash,
      app_name,
      assigned_schema_name,
      allowed_return_urls,
   ]);

   return result.rows[0];
};

/**
 * Delete client server
 * @param {string} clientId - Client ID
 * @returns {boolean} True if deleted successfully
 */
export const deleteClientServer = async (clientId) => {
   const pool = await getPool();

   if (!clientId) {
      throw new Error("Client ID is required");
   }

   const result = await pool.query(deleteClientServerQuery, [clientId]);
   return result.rowCount > 0;
};

/**
 * Check if client server exists
 * @param {string} clientId - Client ID
 * @returns {boolean} True if exists
 */
export const clientServerExists = async (clientId) => {
   const clientServer = await getClientServerByClientId(clientId);
   return clientServer !== null;
};

// Export as a service object for convenience
export const clientServerRepository = {
   create: createClientServer,
   getByClientId: getClientServerByClientId,
   getByClientSecretHash: getClientServerByClientSecretHash,
   update: updateClientServer,
   delete: deleteClientServer,
   exists: clientServerExists,
};

export default clientServerRepository;
