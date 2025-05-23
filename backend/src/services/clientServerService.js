import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
   AuthError,
   ValidationError,
   NotFoundError,
} from "../middleware/errorHandler.js";
import { getPoolForSchema } from "../db/connection/clientServers.js";
import * as clientServersRepo from "../db/repositories/clientServersRepository.js";
import { Pool } from "pg";
import config from "../utils/config.js";
import { ddl as authInternalDDL } from "../db/schemas/auth_internal/client_servers.js";

/**
 * Client Server Service
 * Handles client server registration, authentication, and management
 */

// Pool for auth_internal schema operations
let authInternalPool = null;

const getAuthInternalPool = async () => {
   if (!authInternalPool) {
      authInternalPool = new Pool(config.postgres);
      await authInternalPool.connect();

      // Initialize auth_internal schema
      const statements = authInternalDDL("auth_internal");
      for (const stmt of statements) {
         await authInternalPool.query(stmt);
      }

      await authInternalPool.query("SET search_path TO auth_internal, public");
   }
   return authInternalPool;
};

/**
 * Register a new client server
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

      // Create client server record
      const clientServer = await clientServersRepo.createClientServer(pool, {
         client_id,
         client_secret_hash,
         app_name,
         assigned_schema_name,
         allowed_return_urls,
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
   authenticateClientServer,
   verifyApiToken,
   getClientServerInfo,
   updateClientServer,
   deleteClientServer,
};

export default clientServerService;
