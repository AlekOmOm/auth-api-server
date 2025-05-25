/**
 * Pool Service - Helper for resolving database pools based on session context
 *
 * This service provides a clean interface for controllers to get the right
 * database pool without worrying about the underlying schema detection logic.
 *
 * Role Hierarchy:
 * - admin: System administrator (seeded in DB, full access to auth_internal)
 * - owner: Client server owner (manages client servers, auth_internal access)
 * - user: Tenant user (basic auth only, tenant pool access)
 *
 * session updates:
 * - poolContext:
 *    - auth_internal: system admin or client owner
 *    - client_tenant: tenant user
 *    - api_client: api client
 * -
 */

import {
   resolvePoolFromSession,
   POOL_CONTEXTS,
   USER_ROLES,
   getPoolContextInfo,
   isSystemAdmin,
   isClientOwner,
   isTenantUser,
   getUserRole,
} from "../middleware/schemaDetection.js";
import getPool from "../repo/connection/pools/auth.js";
import getPoolForSchema from "../repo/connection/pools/clientServers.js";

/**
 * Get the appropriate database pool for the current request context
 * @param {Object} req - Express request object with session
 * @returns {Object} Database pool
 */
export const getPoolForRequest = async (req) => {
   try {
      return await resolvePoolFromSession(req);
   } catch (error) {
      console.error("❌ Error resolving pool from session:", error);
      // Fallback to default schema pool
      const defaultSchema = process.env.SEED_SCHEMA || "client_template";
      return await getPoolForSchema(defaultSchema);
   }
};

/**
 * Get admin pool (auth_internal) - for system and client server management
 * - admin (auth-system admin)
 * - owner (client-server owner)
 *
 * @returns {Object} Auth internal database pool
 */
export const getAdminPool = async () => {
   return await getPool();
};

/**
 * Get tenant pool for specific schema - for direct schema access
 * - user (tenant user)
 *
 * @param {string} schema - Schema name
 * @returns {Object} Tenant-specific database pool
 */
export const getTenantPool = async (schema) => {
   return await getPoolForSchema(schema);
};

/**
 * Check if current request has admin privileges (system admin or client owner)
 * @param {Object} req - Express request object
 * @returns {boolean} True if user has admin context
 */
export const hasAdminContext = (req) => {
   return req.session?.poolContext === POOL_CONTEXTS.AUTH_INTERNAL;
};

/**
 * Check if current request is from API client
 * @param {Object} req - Express request object
 * @returns {boolean} True if request is from API client
 */
export const isApiClient = (req) => {
   return req.session?.poolContext === POOL_CONTEXTS.API_CLIENT;
};

/**
 * Check if current request is from tenant user
 * @param {Object} req - Express request object
 * @returns {boolean} True if request is from tenant user
 */
export const isTenantUserContext = (req) => {
   return req.session?.poolContext === POOL_CONTEXTS.CLIENT_TENANT;
};

/**
 * Get context metadata for current request
 * @param {Object} req - Express request object
 * @returns {Object} Context metadata
 */
export const getRequestContext = (req) => {
   return getPoolContextInfo(req);
};

/**
 * Ensure user has admin privileges (system admin or client owner)
 * @param {Object} req - Express request object
 * @throws {Error} If user doesn't have admin privileges
 */
export const requireAdminContext = (req) => {
   if (!hasAdminContext(req)) {
      const userRole = getUserRole(req);
      throw new Error(`Admin privileges required. Current role: ${userRole}`);
   }
};

/**
 * Ensure user is system admin specifically
 * @param {Object} req - Express request object
 * @throws {Error} If user is not system admin
 */
export const requireSystemAdmin = (req) => {
   if (!isSystemAdmin(req)) {
      const userRole = getUserRole(req);
      throw new Error(
         `System admin privileges required. Current role: ${userRole}`
      );
   }
};

/**
 * Ensure user is client server owner
 * @param {Object} req - Express request object
 * @throws {Error} If user is not client owner
 */
export const requireClientOwner = (req) => {
   if (!isClientOwner(req)) {
      const userRole = getUserRole(req);
      throw new Error(
         `Client server owner privileges required. Current role: ${userRole}`
      );
   }
};

/**
 * Ensure request is from valid API client - throws error if not
 * @param {Object} req - Express request object
 * @throws {Error} If request is not from valid API client
 */
export const requireApiContext = (req) => {
   if (!isApiClient(req)) {
      throw new Error(
         "Valid API client credentials required for this operation"
      );
   }
};

/**
 * Execute query with appropriate pool based on context
 * @param {Object} req - Express request object
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} Query result
 */
export const executeQuery = async (req, query, params = []) => {
   try {
      const pool = await getPoolForRequest(req);
      const result = await pool.query(query, params);
      return result.rows;
   } catch (error) {
      console.error("❌ Error executing query:", error);
      throw error;
   }
};

/**
 * Execute admin query (requires admin context - system admin or client owner)
 * @param {Object} req - Express request object
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} Query result
 */
export const executeAdminQuery = async (req, query, params = []) => {
   requireAdminContext(req);

   try {
      const adminPool = await getAdminPool();
      const result = await adminPool.query(query, params);
      return result.rows;
   } catch (error) {
      console.error("❌ Error executing admin query:", error);
      throw error;
   }
};

/**
 * Execute system admin query (requires system admin only)
 * @param {Object} req - Express request object
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} Query result
 */
export const executeSystemAdminQuery = async (req, query, params = []) => {
   requireSystemAdmin(req);

   try {
      const adminPool = await getAdminPool();
      const result = await adminPool.query(query, params);
      return result.rows;
   } catch (error) {
      console.error("❌ Error executing system admin query:", error);
      throw error;
   }
};

/**
 * Get database connection info for debugging
 * @param {Object} req - Express request object
 * @returns {Object} Connection info
 */
export const getConnectionInfo = async (req) => {
   const context = getRequestContext(req);
   const pool = await getPoolForRequest(req);

   return {
      context,
      userRole: getUserRole(req),
      poolConfig: {
         database: pool.options?.database,
         host: pool.options?.host,
         port: pool.options?.port,
         // Don't expose sensitive info like passwords
      },
   };
};

/**
 * Helper to determine appropriate operations based on user role
 * @param {Object} req - Express request object
 * @returns {Object} Available operations for user
 */
export const getAvailableOperations = (req) => {
   const userRole = getUserRole(req);

   const operations = {
      // Basic operations available to all authenticated users
      basic: ["login", "logout", "getCurrentUser"],

      // Admin operations (system admin + client owners)
      admin: [],

      // System admin only operations
      systemAdmin: [],

      // Client owner operations
      clientOwner: [],

      // Tenant user operations
      tenantUser: ["register", "login", "logout"],
   };

   switch (userRole) {
      case USER_ROLES.ADMIN:
         operations.systemAdmin = [
            "viewAllClients",
            "deleteAnyClient",
            "systemConfig",
         ];
         operations.admin = ["manageClients", "viewClientStats"];
         operations.clientOwner = [
            "createClient",
            "updateOwnClients",
            "deleteOwnClients",
         ];
         break;

      case USER_ROLES.OWNER:
         operations.admin = ["manageClients", "viewClientStats"];
         operations.clientOwner = [
            "createClient",
            "updateOwnClients",
            "deleteOwnClients",
         ];
         break;

      case USER_ROLES.USER:
      default:
         // Only basic + tenant operations
         break;
   }

   return {
      userRole,
      available: [
         ...operations.basic,
         ...operations.admin,
         ...operations.systemAdmin,
         ...operations.clientOwner,
         ...operations.tenantUser,
      ],
      operations,
   };
};

export const poolService = {
   getPoolForRequest,
   getAdminPool,
   getTenantPool,
   hasAdminContext,
   isApiClient,
   isTenantUserContext,
   getRequestContext,
   requireAdminContext,
   requireSystemAdmin,
   requireClientOwner,
   requireApiContext,
   executeQuery,
   executeAdminQuery,
   executeSystemAdminQuery,
   getConnectionInfo,
   getAvailableOperations,
};

export default poolService;
