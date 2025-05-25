/**
 * Admin Service Layer for client_servers operations
 *
 * This service wraps the repository layer with:
 * - Session-based pool resolution (no manual pool management)
 * - UUID generation
 * - Error handling
 * - Business logic validation
 * - Role-based access control
 */

import * as clientServersRepo from "./repositories/clientServersRepository.js";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import {
   requireClientOwner,
   requireSystemAdmin,
} from "../services/poolService.js";

/**
 * Create a new client server (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {Object} clientServerData - Client server data
 * @returns {Object} Created client server with generated IDs
 */
export const createClientServer = async (req, clientServerData) => {
   try {
      const {
         app_name,
         assigned_schema_name,
         allowed_return_urls,
         user_id,
         client_mode = "frontend-login-proxy",
      } = clientServerData;

      // UUID generation
      const client_id = `client_${uuidv4().replace(/-/g, "")}`;
      const client_secret = uuidv4();
      const client_secret_hash = await bcrypt.hash(client_secret, 12);

      // validation
      if (!app_name || !assigned_schema_name || !allowed_return_urls) {
         throw new Error(
            "app_name, assigned_schema_name, and allowed_return_urls are required"
         );
      }

      const completeClientData = {
         client_id,
         client_secret_hash,
         app_name,
         assigned_schema_name,
         allowed_return_urls,
         user_id: user_id || null,
         client_mode,
      };

      const result = await clientServersRepo.createClientServer(
         req,
         completeClientData
      );

      return {
         ...result,
         client_secret, // unhashed secret for one-time return
      };
   } catch (error) {
      console.error("Admin Service - Create Client Server Error:", error);
      throw error;
   }
};

/**
 * Get client server by ID (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} clientId - Client ID
 * @returns {Object} Client server or null
 */
export const getClientServerByClientId = async (req, clientId) => {
   try {
      return await clientServersRepo.getClientServer(req, clientId);
   } catch (error) {
      console.error("Admin Service - Get Client Server Error:", error);
      throw error;
   }
};

/**
 * Update client server (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} clientId - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated client server
 */
export const updateClientServer = async (req, clientId, updateData) => {
   try {
      // Get existing client first
      const existingClient = await clientServersRepo.getClientServer(
         req,
         clientId
      );
      if (!existingClient) {
         throw new Error("Client server not found");
      }

      // Check ownership - only system admin can update any client, owners can only update their own
      if (
         !isSystemAdmin(req) &&
         existingClient.user_id !== req.session?.userId
      ) {
         throw new Error(
            "Access denied: Can only update your own client servers"
         );
      }

      // Merge update data with existing (keep sensitive fields)
      const updatedClient = {
         client_id: clientId,
         client_secret_hash: existingClient.client_secret_hash, // Keep existing
         app_name: updateData.app_name || existingClient.app_name,
         assigned_schema_name: existingClient.assigned_schema_name, // Cannot change
         allowed_return_urls:
            updateData.allowed_return_urls ||
            existingClient.allowed_return_urls,
         client_mode: updateData.client_mode || existingClient.client_mode,
      };

      return await clientServersRepo.updateClientServer(req, updatedClient);
   } catch (error) {
      console.error("Admin Service - Update Client Server Error:", error);
      throw error;
   }
};

/**
 * Delete client server (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} clientId - Client ID
 * @returns {Object} Deleted client server
 */
export const deleteClientServer = async (req, clientId) => {
   try {
      // Get existing client first to check ownership
      const existingClient = await clientServersRepo.getClientServer(
         req,
         clientId
      );
      if (!existingClient) {
         throw new Error("Client server not found");
      }

      // Check ownership - only system admin can delete any client, owners can only delete their own
      if (
         !isSystemAdmin(req) &&
         existingClient.user_id !== req.session?.userId
      ) {
         throw new Error(
            "Access denied: Can only delete your own client servers"
         );
      }

      return await clientServersRepo.deleteClientServer(req, clientId);
   } catch (error) {
      console.error("Admin Service - Delete Client Server Error:", error);
      throw error;
   }
};

/**
 * Get all client servers for a user (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID (optional, defaults to session user)
 * @returns {Array} Client servers for user
 */
export const getUserClientServers = async (req, userId = null) => {
   try {
      const targetUserId = userId || req.session?.userId;

      if (!targetUserId) {
         throw new Error("User ID required");
      }

      // Check access - system admin can view any user's clients, others can only view their own
      if (!isSystemAdmin(req) && targetUserId !== req.session?.userId) {
         throw new Error(
            "Access denied: Can only view your own client servers"
         );
      }

      return await clientServersRepo.getClientServersByUserId(
         req,
         targetUserId
      );
   } catch (error) {
      console.error("Admin Service - Get User Client Servers Error:", error);
      throw error;
   }
};

/**
 * Get specific client server for a user (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {Object} Client server or null
 */
export const getUserClientServer = async (req, userId, clientId) => {
   try {
      // Check access - system admin can view any user's clients, others can only view their own
      if (!isSystemAdmin(req) && userId !== req.session?.userId) {
         throw new Error(
            "Access denied: Can only view your own client servers"
         );
      }

      return await clientServersRepo.getClientServerByUserIdAndClientId(
         req,
         userId,
         clientId
      );
   } catch (error) {
      console.error("Admin Service - Get User Client Server Error:", error);
      throw error;
   }
};

/**
 * Update client server for a user (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated client server
 */
export const updateUserClientServer = async (
   req,
   userId,
   clientId,
   updateData
) => {
   try {
      // Check access - system admin can update any user's clients, others can only update their own
      if (!isSystemAdmin(req) && userId !== req.session?.userId) {
         throw new Error(
            "Access denied: Can only update your own client servers"
         );
      }

      // Verify ownership first
      const existingClient =
         await clientServersRepo.getClientServerByUserIdAndClientId(
            req,
            userId,
            clientId
         );
      if (!existingClient) {
         throw new Error("Client server not found or access denied");
      }

      // Use the general update method but ensure user owns the client
      return await updateClientServer(req, clientId, updateData);
   } catch (error) {
      console.error("Admin Service - Update User Client Server Error:", error);
      throw error;
   }
};

/**
 * Delete client server for a user (Admin/Service Layer)
 * @param {Object} req - Express request object with session context
 * @param {string} userId - User ID
 * @param {string} clientId - Client ID
 * @returns {Object} Deleted client server
 */
export const deleteUserClientServer = async (req, userId, clientId) => {
   try {
      // Check access - system admin can delete any user's clients, others can only delete their own
      if (!isSystemAdmin(req) && userId !== req.session?.userId) {
         throw new Error(
            "Access denied: Can only delete your own client servers"
         );
      }

      return await clientServersRepo.deleteClientServerByUserIdAndClientId(
         req,
         userId,
         clientId
      );
   } catch (error) {
      console.error("Admin Service - Delete User Client Server Error:", error);
      throw error;
   }
};

/**
 * Get all client servers (System Admin only)
 * @param {Object} req - Express request object with session context
 * @returns {Array} All client servers
 */
export const getAllClientServers = async (req) => {
   try {
      requireSystemAdmin(req);

      // For system admin, we need to query all client servers across all users
      // This requires direct SQL since it's a system-wide operation
      const { executeSystemAdminQuery } = await import(
         "../services/poolService.js"
      );

      const query = `
         SELECT client_id, app_name, assigned_schema_name, allowed_return_urls, 
                client_mode, user_id, created_at, updated_at 
         FROM client_servers 
         ORDER BY created_at DESC
      `;

      return await executeSystemAdminQuery(req, query);
   } catch (error) {
      console.error("Admin Service - Get All Client Servers Error:", error);
      throw error;
   }
};

// Export as service object
export const adminService = {
   createClientServer,
   getClientServerByClientId,
   updateClientServer,
   deleteClientServer,
   getUserClientServers,
   getUserClientServer,
   updateUserClientServer,
   deleteUserClientServer,
   getAllClientServers,
};

export default adminService;
