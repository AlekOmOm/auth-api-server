/**
 * Owner Panel Service
 *
 * Provides functionality for auth-system owners to manage:
 * - Client schema creation/deletion
 * - Cross-tenant user management
 * - Analytics and reporting
 */

import { ValidationError, AuthError } from "../utils/customErrors.js";
import getAuthPool from "../repo/connection/pools/auth.js";
import getPoolForSchema from "../repo/connection/pools/clientServers.js";
import Repo from "../repo/index.js";
import * as userService from "./user.js";

/**
 * Create a new schema for a client application
 * @param {Object} params - Parameters object
 * @param {string} params.schemaName - Name of the schema to create
 * @param {string} params.clientId - Client ID that owns this schema
 * @param {string} params.ownerId - Owner user ID performing the action
 * @returns {Object} Creation response
 */
export async function createClientSchema({ schemaName, clientId, ownerId }) {
   try {
      if (!schemaName || !clientId || !ownerId) {
         throw new ValidationError(
            "Schema name, client ID, and owner ID are required"
         );
      }

      // Validate schema name format
      if (!/^client_[a-z0-9_]+$/.test(schemaName)) {
         throw new ValidationError(
            "Schema name must start with 'client_' and contain only lowercase letters, numbers, and underscores"
         );
      }

      // Check if owner owns this client
      const clientServerRepo = new Repo("auth_internal", "client_servers");
      const client = await clientServerRepo.query("getByUserIdAndClientId", {
         user_id: ownerId,
         client_id: clientId,
      });
      if (!client) {
         throw new AuthError(
            "You don't have permission to create schemas for this client"
         );
      }

      const authPool = await getAuthPool();

      // Create the schema using the template
      const createSchemaQuery = `
         -- Create schema
         CREATE SCHEMA IF NOT EXISTS ${schemaName};
         
         -- Switch to new schema
         SET search_path TO ${schemaName};
         
         -- Enable extensions
         CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
         
         -- Create users table
         CREATE TABLE IF NOT EXISTS users (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name            VARCHAR(255) NOT NULL,
            role            VARCHAR(100) NOT NULL DEFAULT 'user',
            email           VARCHAR(255) UNIQUE NOT NULL,
            password_hash   VARCHAR(255) NOT NULL,
            created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
         );
         
         -- Create sessions table
         CREATE TABLE IF NOT EXISTS sessions (
            id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
            session_id      UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
            ip_address      INET,
            user_agent      TEXT,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at      TIMESTAMPTZ
         );
         
         -- Create indexes
         CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
         CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
      `;

      await authPool.query(createSchemaQuery);

      // Update client record with assigned schema
      const updatedClient = await clientServerRepo.query("update", {
         ...client,
         assigned_schema_name: schemaName,
      });

      return {
         message: "Schema created successfully",
         data: {
            schemaName,
            clientId,
            client: updatedClient,
         },
      };
   } catch (error) {
      console.error("🏗️ [OWNER PANEL] Schema creation failed:", error);
      throw error;
   }
}

/**
 * Delete a client schema (DANGEROUS - use with caution)
 * @param {Object} params - Parameters object
 * @param {string} params.schemaName - Name of the schema to delete
 * @param {string} params.clientId - Client ID that owns this schema
 * @param {string} params.ownerId - Owner user ID performing the action
 * @param {boolean} params.confirm - Confirmation flag (must be true)
 * @returns {Object} Deletion response
 */
export async function deleteClientSchema({
   schemaName,
   clientId,
   ownerId,
   confirm = false,
}) {
   try {
      if (!schemaName || !clientId || !ownerId) {
         throw new ValidationError(
            "Schema name, client ID, and owner ID are required"
         );
      }

      if (!confirm) {
         throw new ValidationError(
            "Deletion must be confirmed with confirm=true"
         );
      }

      // Prevent deletion of system schemas
      if (schemaName === "auth_internal" || schemaName === "public") {
         throw new ValidationError("Cannot delete system schemas");
      }

      // Check if owner owns this client
      const clientServerRepo = new Repo("auth_internal", "client_servers");
      const client = await clientServerRepo.query("getByUserIdAndClientId", {
         user_id: ownerId,
         client_id: clientId,
      });
      if (!client || client.assigned_schema_name !== schemaName) {
         throw new AuthError("You don't have permission to delete this schema");
      }

      const authPool = await getAuthPool();

      // Drop the schema cascade (will delete all tables and data)
      const dropSchemaQuery = `DROP SCHEMA IF EXISTS ${schemaName} CASCADE;`;
      await authPool.query(dropSchemaQuery);

      // Update client record to remove assigned schema
      const updatedClient = await clientServerRepo.query("update", {
         ...client,
         assigned_schema_name: null,
      });

      return {
         message: "Schema deleted successfully",
         data: {
            schemaName,
            clientId,
         },
      };
   } catch (error) {
      console.error("🗑️ [OWNER PANEL] Schema deletion failed:", error);
      throw error;
   }
}

/**
 * Get all users across all client schemas owned by this owner
 * @param {Object} params - Parameters object
 * @param {string} params.ownerId - Owner user ID
 * @param {string} params.schemaFilter - Optional schema name filter
 * @returns {Object} Users grouped by schema
 */
export async function getAllUsersAcrossTenants({ ownerId, schemaFilter }) {
   try {
      if (!ownerId) {
         throw new ValidationError("Owner ID is required");
      }

      // Get all clients owned by this user
      const clientServerRepo = new Repo("auth_internal", "client_servers");
      const clients = await clientServerRepo.query("getByUserId", {
         user_id: ownerId,
      });

      const usersBySchema = {};

      for (const client of clients) {
         const schemaName = client.assigned_schema_name;

         // Skip if no schema assigned or doesn't match filter
         if (!schemaName || (schemaFilter && schemaName !== schemaFilter)) {
            continue;
         }

         try {
            // Get users from this schema
            const usersResult = await userService.getUsers(schemaName);
            usersBySchema[schemaName] = {
               clientId: client.id,
               clientName: client.app_name,
               users: usersResult.data.users,
            };
         } catch (error) {
            console.error(
               `Failed to get users from schema ${schemaName}:`,
               error
            );
            usersBySchema[schemaName] = {
               clientId: client.id,
               clientName: client.app_name,
               error: "Failed to retrieve users",
            };
         }
      }

      return {
         message: "Users retrieved successfully",
         data: {
            totalSchemas: Object.keys(usersBySchema).length,
            usersBySchema,
         },
      };
   } catch (error) {
      console.error(
         "👥 [OWNER PANEL] Failed to get users across tenants:",
         error
      );
      throw error;
   }
}

/**
 * Get analytics for all owned clients
 * @param {Object} params - Parameters object
 * @param {string} params.ownerId - Owner user ID
 * @returns {Object} Analytics data
 */
export async function getOwnerAnalytics({ ownerId }) {
   try {
      if (!ownerId) {
         throw new ValidationError("Owner ID is required");
      }

      const authPool = await getAuthPool();

      // Get all clients owned by this user
      const clientServerRepo = new Repo("auth_internal", "client_servers");
      const clients = await clientServerRepo.query("getByUserId", {
         user_id: ownerId,
      });

      const analytics = {
         totalClients: clients.length,
         clientDetails: [],
         totalUsers: 0,
         totalActiveSessions: 0,
      };

      for (const client of clients) {
         const schemaName = client.assigned_schema_name;

         if (!schemaName) {
            analytics.clientDetails.push({
               clientId: client.id,
               clientName: client.app_name,
               schemaName: null,
               userCount: 0,
               activeSessionCount: 0,
               error: "No schema assigned",
            });
            continue;
         }

         try {
            const pool = await getPoolForSchema(schemaName);

            // Count users
            const userCountResult = await pool.query(
               "SELECT COUNT(*) as count FROM users"
            );
            const userCount = parseInt(userCountResult.rows[0].count);

            // Count active sessions
            const sessionCountResult = await pool.query(
               "SELECT COUNT(*) as count FROM sessions WHERE expires_at > NOW()"
            );
            const activeSessionCount = parseInt(
               sessionCountResult.rows[0].count
            );

            analytics.clientDetails.push({
               clientId: client.id,
               clientName: client.app_name,
               schemaName,
               userCount,
               activeSessionCount,
               createdAt: client.created_at,
            });

            analytics.totalUsers += userCount;
            analytics.totalActiveSessions += activeSessionCount;
         } catch (error) {
            console.error(
               `Failed to get analytics for schema ${schemaName}:`,
               error
            );
            analytics.clientDetails.push({
               clientId: client.id,
               clientName: client.app_name,
               schemaName,
               error: "Failed to retrieve analytics",
            });
         }
      }

      return {
         message: "Analytics retrieved successfully",
         data: analytics,
      };
   } catch (error) {
      console.error("📊 [OWNER PANEL] Failed to get analytics:", error);
      throw error;
   }
}

/**
 * Manage user across tenants (create, update, delete)
 * @param {Object} params - Parameters object
 * @param {string} params.action - Action to perform (create, update, delete)
 * @param {string} params.schemaName - Target schema
 * @param {string} params.ownerId - Owner user ID performing the action
 * @param {Object} params.userData - User data for create/update
 * @param {string} params.userId - User ID for update/delete
 * @returns {Object} Operation response
 */
export async function manageTenantUser({
   action,
   schemaName,
   ownerId,
   userData,
   userId,
}) {
   try {
      if (!action || !schemaName || !ownerId) {
         throw new ValidationError(
            "Action, schema name, and owner ID are required"
         );
      }

      // Verify owner has access to this schema
      const clientServerRepo = new Repo("auth_internal", "client_servers");
      const clients = await clientServerRepo.query("getByUserId", {
         user_id: ownerId,
      });
      const hasAccess = clients.some(
         (c) => c.assigned_schema_name === schemaName
      );

      if (!hasAccess) {
         throw new AuthError(
            "You don't have permission to manage users in this schema"
         );
      }

      switch (action) {
         case "create":
            if (
               !userData ||
               !userData.name ||
               !userData.email ||
               !userData.password
            ) {
               throw new ValidationError(
                  "User data with name, email, and password is required"
               );
            }
            return await userService.createUser(userData, schemaName);

         case "update":
            if (!userId || !userData) {
               throw new ValidationError(
                  "User ID and update data are required"
               );
            }
            return await userService.updateUser(userId, userData, schemaName);

         case "delete":
            if (!userId) {
               throw new ValidationError("User ID is required");
            }
            return await userService.deleteUser(userId, schemaName);

         default:
            throw new ValidationError(
               "Invalid action. Must be create, update, or delete"
            );
      }
   } catch (error) {
      console.error("🛠️ [OWNER PANEL] Failed to manage tenant user:", error);
      throw error;
   }
}

const ownerPanelService = {
   createClientSchema,
   deleteClientSchema,
   getAllUsersAcrossTenants,
   getOwnerAnalytics,
   manageTenantUser,
};

export default ownerPanelService;
