import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
   AuthError,
   ValidationError,
   NotFoundError,
} from "../middleware/errorHandler.js";
// client repo has: internal operations with the client's specific schema
import * as clientRepo from "../db/authServerRepository.js";
// client servers repo has: operations with the client_servers table
import * as clientServersRepo from "../db/repositories/clientServersRepository.js";
import config from "../utils/config.js";
/**
 * Client Server Service
 * Handles client server registration, authentication, and management
 */

// Pool for auth_internal schema operations

/**
 * Register a new client server (Public API - no user required)
 * @param {Object} clientData - Client server data
 * @returns {Object} Registration response with client_id and client_secret
 */
export async function registerClientServer(clientData) {
   try {
      const { app_name, allowed_return_urls } = clientData;

      if (
         !app_name ||
         !allowed_return_urls ||
         !Array.isArray(allowed_return_urls)
      ) {
         throw new ValidationError(
            "app_name and allowed_return_urls (array) are required"
         );
      }

      // Generate client credentials
      const client_id = `client_${uuidv4().replace(/-/g, "")}`;
      const client_secret = uuidv4();
      const client_secret_hash = await bcrypt.hash(client_secret, 12);

      // Generate unique schema name
      const assigned_schema_name = `client_${app_name
         .toLowerCase()
         .replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

      const pool = await getAuthInternalPool();

      // Create client server record (no user_id for public API)
      const clientServer = await clientServersRepo.createClientServer(pool, {
         client_id,
         client_secret_hash,
         app_name,
         assigned_schema_name,
         allowed_return_urls,
         user_id: null, // Public registration has no user
         client_mode: "api-auth-server", // Default for public API
      });

      // Initialize the client's schema
      await getPoolForSchema(assigned_schema_name);

      return {
         message: "Client server registered successfully",
         data: {
            client_id,
            client_secret, // Only returned during registration
            app_name,
            assigned_schema_name,
            allowed_return_urls,
         },
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Register a new client server for logged-in user
 * @param {Object} clientData - Client server data
 * @param {string} userId - ID of the user registering the client
 * @returns {Object} Registration response with client_id and client_secret
 */
export async function registerClientServerForUser(clientData, userId) {
   try {
      const {
         app_name,
         allowed_return_urls,
         client_mode = "frontend-login-proxy",
      } = clientData;

      if (!userId) {
         throw new ValidationError("User ID is required");
      }

      if (
         !app_name ||
         !allowed_return_urls ||
         !Array.isArray(allowed_return_urls)
      ) {
         throw new ValidationError(
            "app_name and allowed_return_urls (array) are required"
         );
      }

      if (!["frontend-login-proxy", "api-auth-server"].includes(client_mode)) {
         throw new ValidationError(
            "client_mode must be 'frontend-login-proxy' or 'api-auth-server'"
         );
      }

      // Generate client credentials
      const client_id = `client_${uuidv4().replace(/-/g, "")}`;
      const client_secret = uuidv4();
      const client_secret_hash = await bcrypt.hash(client_secret, 12);

      // Generate unique schema name
      const assigned_schema_name = `client_${app_name
         .toLowerCase()
         .replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

      const pool = await getAuthInternalPool();

      // Create client server record with user ownership
      const clientServer = await clientServersRepo.createClientServer(pool, {
         client_id,
         client_secret_hash,
         app_name,
         assigned_schema_name,
         allowed_return_urls,
         user_id: userId,
         client_mode,
      });

      // Initialize the client's schema
      await getPoolForSchema(assigned_schema_name);

      return {
         message: "Client server registered successfully",
         data: {
            client_id,
            client_secret, // Only returned during registration
            app_name,
            assigned_schema_name,
            allowed_return_urls,
            client_mode,
         },
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Get all client servers for a user
 * @param {string} userId - User ID
 * @returns {Object} List of user's client servers
 */
export async function getUserClientServers(userId) {
   try {
      if (!userId) {
         throw new ValidationError("User ID is required");
      }

      const pool = await getAuthInternalPool();
      const { rows: clientServers } = await pool.query(
         "SELECT client_id, app_name, assigned_schema_name, allowed_return_urls, client_mode, created_at, updated_at FROM client_servers WHERE user_id = $1 ORDER BY created_at DESC",
         [userId]
      );

      return {
         message: "Client servers retrieved successfully",
         data: clientServers,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Get specific client server for a user
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {Object} Client server details
 */
export async function getUserClientServer(userId, clientId) {
   try {
      if (!userId || !clientId) {
         throw new ValidationError("User ID and Client ID are required");
      }

      const pool = await getAuthInternalPool();
      const { rows } = await pool.query(
         "SELECT client_id, app_name, assigned_schema_name, allowed_return_urls, client_mode, created_at, updated_at FROM client_servers WHERE user_id = $1 AND client_id = $2",
         [userId, clientId]
      );

      if (rows.length === 0) {
         throw new NotFoundError("Client server not found or access denied");
      }

      return {
         message: "Client server retrieved successfully",
         data: rows[0],
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Update client server for a user
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated client server
 */
export async function updateUserClientServer(userId, clientId, updateData) {
   try {
      if (!userId || !clientId) {
         throw new ValidationError("User ID and Client ID are required");
      }

      const pool = await getAuthInternalPool();

      // First verify ownership
      const { rows: existing } = await pool.query(
         "SELECT * FROM client_servers WHERE user_id = $1 AND client_id = $2",
         [userId, clientId]
      );

      if (existing.length === 0) {
         throw new NotFoundError("Client server not found or access denied");
      }

      const existingClient = existing[0];

      // Prepare update data (only allow certain fields to be updated)
      const updatedData = {
         client_id: clientId,
         client_secret_hash: existingClient.client_secret_hash, // Keep existing hash
         app_name: updateData.app_name || existingClient.app_name,
         assigned_schema_name: existingClient.assigned_schema_name, // Cannot change schema
         allowed_return_urls:
            updateData.allowed_return_urls ||
            existingClient.allowed_return_urls,
         client_mode: updateData.client_mode || existingClient.client_mode,
      };

      const { rows } = await pool.query(
         "UPDATE client_servers SET app_name = $2, allowed_return_urls = $3, client_mode = $4, updated_at = NOW() WHERE user_id = $5 AND client_id = $1 RETURNING client_id, app_name, assigned_schema_name, allowed_return_urls, client_mode, created_at, updated_at",
         [
            clientId,
            updatedData.app_name,
            updatedData.allowed_return_urls,
            updatedData.client_mode,
            userId,
         ]
      );

      return {
         message: "Client server updated successfully",
         data: rows[0],
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Delete client server for a user
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {Object} Deletion response
 */
export async function deleteUserClientServer(userId, clientId) {
   try {
      if (!userId || !clientId) {
         throw new ValidationError("User ID and Client ID are required");
      }

      const pool = await getAuthInternalPool();

      // Verify ownership and delete
      const { rows } = await pool.query(
         "DELETE FROM client_servers WHERE user_id = $1 AND client_id = $2 RETURNING client_id, app_name",
         [userId, clientId]
      );

      if (rows.length === 0) {
         throw new NotFoundError("Client server not found or access denied");
      }

      return {
         message: "Client server deleted successfully",
         data: { deleted_client: rows[0] },
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Authenticate client server and return API token
 * @param {Object} credentials - Client credentials
 * @returns {Object} Authentication response with API token
 */
export async function authenticateClientServer(credentials) {
   try {
      const { client_id, client_secret } = credentials;

      if (!client_id || !client_secret) {
         throw new ValidationError("client_id and client_secret are required");
      }

      const pool = await getAuthInternalPool();
      const clientServer = await clientServersRepo.getClientServer(
         pool,
         client_id
      );

      if (!clientServer) {
         throw new AuthError("Invalid client credentials");
      }

      // Verify client secret
      const isValidSecret = await bcrypt.compare(
         client_secret,
         clientServer.client_secret_hash
      );
      if (!isValidSecret) {
         throw new AuthError("Invalid client credentials");
      }

      // Generate API token
      const token = jwt.sign(
         {
            client_id,
            schema: clientServer.assigned_schema_name,
            type: "api_token",
         },
         process.env.JWT_SECRET || "your-jwt-secret",
         { expiresIn: "24h" }
      );

      return {
         message: "Authentication successful",
         data: {
            token,
            expires_in: 86400, // 24 hours
            schema: clientServer.assigned_schema_name,
         },
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Verify API token and return client information
 * @param {string} token - API token
 * @returns {Object} Client information
 */
export async function verifyApiToken(token) {
   try {
      if (!token) {
         throw new AuthError("API token is required");
      }

      const decoded = jwt.verify(
         token,
         process.env.JWT_SECRET || "your-jwt-secret"
      );

      if (decoded.type !== "api_token") {
         throw new AuthError("Invalid token type");
      }

      const pool = await getAuthInternalPool();
      const clientServer = await clientServersRepo.getClientServer(
         pool,
         decoded.client_id
      );

      if (!clientServer) {
         throw new AuthError("Client server not found");
      }

      return {
         client_id: decoded.client_id,
         schema: decoded.schema,
         app_name: clientServer.app_name,
         allowed_return_urls: clientServer.allowed_return_urls,
      };
   } catch (error) {
      if (
         error.name === "JsonWebTokenError" ||
         error.name === "TokenExpiredError"
      ) {
         throw new AuthError("Invalid or expired token");
      }
      throw error;
   }
}

/**
 * Get client server information
 * @param {string} client_id - Client ID
 * @returns {Object} Client server information
 */
export async function getClientServerInfo(client_id) {
   try {
      if (!client_id) {
         throw new ValidationError("client_id is required");
      }

      const pool = await getAuthInternalPool();
      const clientServer = await clientServersRepo.getClientServer(
         pool,
         client_id
      );

      if (!clientServer) {
         throw new NotFoundError("Client server not found");
      }

      // Remove sensitive data
      const { client_secret_hash, ...clientInfo } = clientServer;

      return {
         message: "Client server retrieved successfully",
         data: clientInfo,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Update client server information
 * @param {string} client_id - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Update response
 */
export async function updateClientServer(client_id, updateData) {
   try {
      if (!client_id) {
         throw new ValidationError("client_id is required");
      }

      const pool = await getAuthInternalPool();
      const existingClient = await clientServersRepo.getClientServer(
         pool,
         client_id
      );

      if (!existingClient) {
         throw new NotFoundError("Client server not found");
      }

      // Prepare update data
      const updatedClient = {
         client_id,
         client_secret_hash: existingClient.client_secret_hash, // Keep existing hash
         app_name: updateData.app_name || existingClient.app_name,
         assigned_schema_name: existingClient.assigned_schema_name, // Cannot change schema
         allowed_return_urls:
            updateData.allowed_return_urls ||
            existingClient.allowed_return_urls,
         client_mode: updateData.client_mode || existingClient.client_mode,
      };

      const result = await clientServersRepo.updateClientServer(
         pool,
         updatedClient
      );

      // Remove sensitive data
      const { client_secret_hash, ...clientInfo } = result;

      return {
         message: "Client server updated successfully",
         data: clientInfo,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Delete client server (admin only)
 * @param {string} client_id - Client ID
 * @returns {Object} Deletion response
 */
export async function deleteClientServer(client_id) {
   try {
      if (!client_id) {
         throw new ValidationError("client_id is required");
      }

      const pool = await getAuthInternalPool();
      const existingClient = await clientServersRepo.getClientServer(
         pool,
         client_id
      );

      if (!existingClient) {
         throw new NotFoundError("Client server not found");
      }

      await clientServersRepo.deleteClientServer(pool, client_id);

      return {
         message: "Client server deleted successfully",
      };
   } catch (error) {
      throw error;
   }
}

export const clientServerService = {
   registerClientServer,
   registerClientServerForUser,
   getUserClientServers,
   getUserClientServer,
   updateUserClientServer,
   deleteUserClientServer,
   authenticateClientServer,
   verifyApiToken,
   getClientServerInfo,
   updateClientServer,
   deleteClientServer,
};

export default clientServerService;
