import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
   AuthError,
   ValidationError,
   NotFoundError,
} from "../middleware/errorHandler.js";
import * as adminRepo from "../repo/adminRepository.js";
import * as userRepo from "../repo/repositories/userRepository.js";
import config from "../config/env.js";
import getPool from "../repo/connection/pools/auth.js";
import getPoolForSchema from "../repo/connection/pools/clientServers.js";
import { POOL_CONTEXTS, USER_ROLES } from "../middleware/schemaDetection.js";

// Helper function to get auth internal pool
const getAuthInternalPool = async () => {
   return await getPool();
};
/**
 * Client Server Service
 * Handles client server registration, authentication, and management
 */

/**
 * session context
 *
 *
 */

/**
 * Register a new client server (Public API - no user required)
 * @param {Object} req - Express request object
 * @returns {Object} Registration response with client_id and client_secret
 */
export async function registerClientServer(req) {
   try {
      const {
         app_name,
         allowed_return_urls,
         user_id: user_email_for_id,
      } = req.body;

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
      let actual_user_id = null;

      if (user_email_for_id) {
         const user = await userRepo.getUserByEmail(
            pool,
            "auth_internal",
            user_email_for_id
         );
         if (user && user.id) {
            actual_user_id = user.id;
         } else {
            console.warn(
               `User not found for email: ${user_email_for_id}. Proceeding with null user_id for client server.`
            );
         }
      }

      // Create client server record
      const clientServer = await adminRepo.createClientServer(
         req,
         {
            client_id,
            client_secret_hash,
            app_name,
            assigned_schema_name,
            allowed_return_urls,
            user_id: actual_user_id,
            client_mode: "api-auth-server",
         },
         pool
      );

      // Initialize the client's schema
      await getPoolForSchema(assigned_schema_name);

      return {
         message: "Client server registered successfully",
         data: {
            client_id,
            client_secret,
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
 * @param {Object} req - Express request object with session
 * @returns {Object} Registration response with client_id and client_secret
 */
export async function registerClientServerForUser(clientData, req) {
   console.log(
      "🚀 [SVC] registerClientServerForUser: Raw clientData:",
      JSON.stringify(clientData, null, 2)
   );
   try {
      const {
         app_name,
         allowed_return_urls,
         client_mode = "frontend-login-proxy",
         assigned_schema_name: schema_name_from_input,
      } = clientData;

      console.log(
         "🚀 [SVC] registerClientServerForUser: Destructured values:",
         JSON.stringify(
            {
               app_name,
               allowed_return_urls,
               client_mode,
               schema_name_from_input,
            },
            null,
            2
         )
      );

      const userId = req.session?.userId;
      if (!userId) {
         throw new ValidationError("User ID is required");
      }

      // Validate app_name first
      if (!(typeof app_name === "string" && app_name.trim() !== "")) {
         throw new ValidationError("app_name (non-empty string) is required");
      }
      const trimmed_app_name = app_name.trim();

      // Ensure allowed_return_urls is an array and filter empty strings
      console.log(
         "🚀 [SVC] registerClientServerForUser: Pre-processing allowed_return_urls:",
         JSON.stringify(allowed_return_urls, null, 2)
      );
      const allowed_urls_array = Array.isArray(allowed_return_urls)
         ? allowed_return_urls.filter(
              (url) => typeof url === "string" && url.trim() !== ""
           )
         : [];
      console.log(
         "🚀 [SVC] registerClientServerForUser: Post-processing allowed_urls_array:",
         JSON.stringify(allowed_urls_array, null, 2)
      );

      // Validate allowed_urls_array
      if (allowed_urls_array.length === 0) {
         throw new ValidationError(
            "At least one valid allowed_return_url is required"
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

      // Basic validation for schema name from input to prevent issues
      const SinputSchemaName =
         typeof schema_name_from_input === "string"
            ? schema_name_from_input.trim()
            : "";
      const isValidInputSchemaName =
         SinputSchemaName !== "" &&
         /^[a-z0-9_]+$/.test(SinputSchemaName.toLowerCase());

      const SappName = trimmed_app_name;

      const final_assigned_schema_name = isValidInputSchemaName
         ? SinputSchemaName.toLowerCase()
         : `client_${SappName.toLowerCase().replace(
              /[^a-z0-9]/g,
              "_"
           )}_${Date.now()}`;
      console.log(
         "🚀 [SVC] registerClientServerForUser: final_assigned_schema_name:",
         final_assigned_schema_name
      );

      const pool = await getAuthInternalPool();

      const dataForRepo = {
         client_id,
         client_secret_hash,
         app_name: trimmed_app_name,
         assigned_schema_name: final_assigned_schema_name,
         allowed_return_urls: allowed_urls_array,
         user_id: userId,
         client_mode,
      };
      console.log(
         "🚀 [SVC] registerClientServerForUser: Data for adminRepo.createClientServer:",
         JSON.stringify(dataForRepo, null, 2)
      );

      const clientServer = await adminRepo.createClientServer(
         req,
         dataForRepo,
         pool
      );
      console.log(
         "🚀 [SVC] registerClientServerForUser: Result from adminRepo:",
         JSON.stringify(clientServer, null, 2)
      );

      await getPoolForSchema(final_assigned_schema_name);
      console.log(
         "🚀 [SVC] registerClientServerForUser: Successfully initialized schema:",
         final_assigned_schema_name
      );

      // REQUIRED ADDITION: Update session context after client creation
      if (req.session) {
         // Clear existing pool context to trigger role re-detection
         delete req.session.poolContext;
         delete req.session.poolMetadata;

         // Or directly set owner context
         req.session.poolContext = POOL_CONTEXTS.AUTH_INTERNAL;
         req.session.poolMetadata = {
            user_id: req.session.userId,
            user_role: USER_ROLES.OWNER,
            owned_clients: 1, // Assuming this is the first client, or adjust as needed
         };
      }

      console.log(
         "🚀 [SVC] registerClientServerForUser: Successfully created client server and updated session."
      );
      return {
         message: "Client server registered successfully",
         data: {
            client_id,
            client_secret,
            app_name: trimmed_app_name,
            assigned_schema_name: final_assigned_schema_name,
            allowed_return_urls: allowed_urls_array,
            client_mode,
         },
      };
   } catch (error) {
      console.error("❌ [SVC-ERR] registerClientServerForUser:", error);
      throw error;
   }
}

/**
 * Get all client servers for a user
 * @param {Object} req - Express request object with session
 * @returns {Object} List of user's client servers
 */
export async function getUserClientServers(req) {
   try {
      const userId = req.session?.userId;
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
 * @param {Object} req - Express request object with session
 * @param {string} clientId - Client ID
 * @returns {Object} Client server details
 */
export async function getUserClientServer(req, clientId) {
   try {
      const userId = req.session?.userId;
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
 * @param {Object} req - Express request object with session
 * @param {string} clientId - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated client server
 */
export async function updateUserClientServer(req, clientId, updateData) {
   try {
      const userId = req.session?.userId;
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
 * @param {Object} req - Express request object with session
 * @param {string} clientId - Client ID
 * @returns {Object} Deletion response
 */
export async function deleteUserClientServer(req, clientId) {
   try {
      const userId = req.session?.userId;
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
 * @param {Object} req - Express request object
 * @returns {Object} Authentication response with API token
 */
export async function authenticateClientServer(req) {
   try {
      const { client_id, client_secret } = req.body;

      if (!client_id || !client_secret) {
         throw new ValidationError("client_id and client_secret are required");
      }

      const pool = await getAuthInternalPool();
      const clientServer = await adminRepo.getClientServer(pool, client_id);

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
      const clientServer = await adminRepo.getClientServer(
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
      const clientServer = await adminRepo.getClientServer(pool, client_id);

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
      const existingClient = await adminRepo.getClientServer(pool, client_id);

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

      const result = await adminRepo.updateClientServer(pool, updatedClient);

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
      const existingClient = await adminRepo.getClientServer(pool, client_id);

      if (!existingClient) {
         throw new NotFoundError("Client server not found");
      }

      await adminRepo.deleteClientServer(pool, client_id);

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
