import { verifyApiToken } from "../services/clientServerService.js";
import * as clientServersRepo from "../repo/repositories/clientServersRepository.js";
import config from "../utils/config.js";
import getPool from "../repo/connection/pools/auth.js";
import getPoolForSchema from "../repo/connection/pools/clientServers.js";

/**
 * Enhanced middleware to detect and set database schema + pool context in session
 *
 * User Role Hierarchy:
 * 1. admin - System administrator (seeded in DB, full access)
 * 2. owner - Client server owner (registered user who owns client_servers)
 * 3. user - Tenant user (end-users of client applications)
 *
 * Pool Context Mapping:
 * 1. Frontend-Login-Proxy mode (return_url) → CLIENT_TENANT pool (tenant users)
 * 2. API-Auth-Server mode (Bearer token) → API_CLIENT pool (server-to-server)
 * 3. Owner mode (user owns client_servers) → AUTH_INTERNAL pool (client management)
 * 4. Admin mode (system admin) → AUTH_INTERNAL pool (system management)
 * 5. Default mode → DEFAULT pool (fallback)
 */

/**
 * Pool context types for session storage
 */
export const POOL_CONTEXTS = {
   AUTH_INTERNAL: "auth_internal", // For admin/client owners
   CLIENT_TENANT: "client_tenant", // For tenant users
   API_CLIENT: "api_client", // For API clients
   DEFAULT: "default", // For default/fallback
};

/**
 * User role types
 */
export const USER_ROLES = {
   ADMIN: "admin", // System administrator
   OWNER: "owner", // Client server owner
   USER: "user", // Tenant user
};

/**
 * Resolve actual pool from session context
 * @param {Object} req - Request object with session
 * @returns {Object} Database pool
 */
export const resolvePoolFromSession = async (req) => {
   const poolContext = req.session?.poolContext || POOL_CONTEXTS.DEFAULT;
   const schema =
      req.session?.schema || process.env.SEED_SCHEMA || "client_template";

   switch (poolContext) {
      // admin or owner
      case POOL_CONTEXTS.AUTH_INTERNAL:
         return await getPool();

      // user (tenant) - call from 1) frontend redirect or 2) api server-server
      case POOL_CONTEXTS.CLIENT_TENANT:
      case POOL_CONTEXTS.API_CLIENT:
         return await getPoolForSchema(schema); // Tenant-specific pool

      // default
      case POOL_CONTEXTS.DEFAULT:
      default:
         return await getPoolForSchema(schema); // Default tenant pool
   }
};

/**
 * Set pool context in session
 * @param {string} context - Pool context type
 * @param {Object} metadata - Additional context metadata
 */
const setPoolContext = (req, context, schema, metadata = {}) => {
   /**
    * req:
    *  {
    *    session: {
    *      poolContext: context,
    *      schema: schema,
    *      poolMetadata: metadata
    *    }
    *  }
    */
   req.session.poolContext = context;
   req.session.schema = schema;
   req.session.poolMetadata = metadata;
};

/**
 * Detect schema from return_url parameter for Frontend-Login-Proxy mode
 * Sets CLIENT_TENANT pool context (for tenant users)
 */
export const detectSchemaFromReturnUrl = async (req, res, next) => {
   try {
      console.log(
         "🔍 [SCHEMA DETECTION] Starting schema detection from return URL"
      );
      console.log("🔍 [SCHEMA DETECTION] req.method:", req.method);
      console.log("🔍 [SCHEMA DETECTION] req.url:", req.url);
      console.log(
         "🔍 [SCHEMA DETECTION] req.body:",
         JSON.stringify(req.body, null, 2)
      );
      console.log(
         "🔍 [SCHEMA DETECTION] req.query:",
         JSON.stringify(req.query, null, 2)
      );

      const returnUrl = req.body?.returnUrl;
      console.log(
         "🔍 [SCHEMA DETECTION] Extracted returnUrl from req.body:",
         returnUrl
      );

      if (returnUrl !== null && returnUrl !== undefined) {
         console.log(
            "🔍 [SCHEMA DETECTION] Return URL found, proceeding with client lookup"
         );

         const authInternalPool = await getPool();
         console.log("🔍 [SCHEMA DETECTION] Got auth internal pool");

         // Get all client servers and find matching one
         const { rows: clientServers } = await authInternalPool.query(
            "SELECT * FROM auth_internal.client_servers UNION ALL SELECT * FROM public.client_servers"
         );

         console.log(
            "🔍 [SCHEMA DETECTION] Found client servers:",
            clientServers.length,
            clientServers.map((c) => ({
               client_id: c.client_id,
               app_name: c.app_name,
               assigned_schema_name: c.assigned_schema_name,
               allowed_return_urls: c.allowed_return_urls,
            }))
         );

         const matchingClient = clientServers.find((client) => {
            console.log(
               "🔍 [SCHEMA DETECTION] Checking client:",
               client.client_id,
               "app_name:",
               client.app_name,
               "allowed_return_urls:",
               client.allowed_return_urls,
               "type:",
               typeof client.allowed_return_urls
            );

            const isMatch = client.allowed_return_urls.some((allowedUrl) => {
               console.log(
                  "🔍 [SCHEMA DETECTION] Checking allowedUrl:",
                  allowedUrl,
                  "type:",
                  typeof allowedUrl,
                  "against returnUrl:",
                  returnUrl
               );

               const matches =
                  allowedUrl && returnUrl && returnUrl.startsWith(allowedUrl);
               console.log("🔍 [SCHEMA DETECTION] URL match result:", matches);
               return matches;
            });

            console.log("🔍 [SCHEMA DETECTION] Client match result:", isMatch);
            return isMatch;
         });

         if (matchingClient) {
            console.log("🔍 [SCHEMA DETECTION] ✅ Found matching client:", {
               client_id: matchingClient.client_id,
               app_name: matchingClient.app_name,
               schema: matchingClient.assigned_schema_name,
               client_mode: matchingClient.client_mode,
            });

            // Set CLIENT_TENANT context - this is a tenant user, not admin/owner
            setPoolContext(
               req,
               POOL_CONTEXTS.CLIENT_TENANT,
               matchingClient.assigned_schema_name,
               {
                  client_id: matchingClient.client_id,
                  app_name: matchingClient.app_name,
                  client_mode: matchingClient.client_mode,
                  return_url: returnUrl,
                  allowed_return_urls: matchingClient.allowed_return_urls,
                  user_role: USER_ROLES.USER,
               }
            );

            console.log("🔍 [SCHEMA DETECTION] ✅ Set pool context:", {
               poolContext: POOL_CONTEXTS.CLIENT_TENANT,
               schema: matchingClient.assigned_schema_name,
               metadata: {
                  client_id: matchingClient.client_id,
                  app_name: matchingClient.app_name,
                  return_url: returnUrl,
               },
            });
         } else {
            console.log(
               "🔍 [SCHEMA DETECTION] ❌ No matching client found for returnUrl:",
               returnUrl
            );
            console.log(
               "🔍 [SCHEMA DETECTION] Available clients:",
               clientServers.map((c) => ({
                  client_id: c.client_id,
                  allowed_urls: c.allowed_return_urls,
               }))
            );
         }
      } else {
         console.log(
            "🔍 [SCHEMA DETECTION] No return URL found in request body, skipping client lookup"
         );
      }

      console.log(
         "🔍 [SCHEMA DETECTION] Schema detection completed, calling next()"
      );
      next();
   } catch (error) {
      console.error(
         "❌ [SCHEMA DETECTION] Error detecting schema from return_url:",
         error
      );
      next();
   }
};

/**
 * Detect schema from API Bearer token for API-Auth-Server mode
 * Sets API_CLIENT pool context (for server-to-server calls)
 */
export const detectSchemaFromApiToken = async (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
         const token = authHeader.substring(7);

         try {
            const clientInfo = await verifyApiToken(token);

            // Set API_CLIENT context - this is a server-to-server API call
            setPoolContext(req, POOL_CONTEXTS.API_CLIENT, clientInfo.schema, {
               client_id: clientInfo.client_id,
               app_name: clientInfo.app_name,
               allowed_return_urls: clientInfo.allowed_return_urls,
               token_type: "api_token",
               user_role: "api_client",
            });

            req.clientContext = clientInfo; // Backward compatibility
         } catch (tokenError) {
            console.log("⚠️ Invalid API token, using default schema");
         }
      }

      next();
   } catch (error) {
      console.error("❌ Error detecting schema from API token:", error);
      next(); // Continue with default behavior
   }
};

/**
 * Detect user role and set appropriate context
 * - admin: System administrator (role = 'admin')
 * - owner: Client server owner (has client_servers records)
 * - user: Regular user (default)
 */
export const detectUserRole = async (req, res, next) => {
   try {
      // Only check if user is logged in and no other context is set
      if (req.session?.userId && !req.session?.poolContext) {
         const userRole = req.session?.role;

         // Check if user is system admin
         if (userRole === "admin") {
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               user_id: req.session.userId,
               user_role: USER_ROLES.ADMIN,
               system_admin: true,
            });
            return next();
         }

         // Check if user owns any client servers (making them an owner)
         const authInternalPool = await getPool();
         const { rows: userClients } = await authInternalPool.query(
            "SELECT COUNT(*) as client_count FROM client_servers WHERE user_id = $1",
            [req.session.userId]
         );

         if (userClients[0]?.client_count > 0) {
            // Owner owns client servers - they are an owner
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               user_id: req.session.userId,
               user_role: USER_ROLES.OWNER,
               owned_clients: userClients[0].client_count,
            });
         } else {
            // Regular user - will use default tenant pool
            setPoolContext(
               req,
               POOL_CONTEXTS.DEFAULT,
               process.env.SEED_SCHEMA || "client_template",
               {
                  user_id: req.session.userId,
                  user_role: USER_ROLES.USER,
                  reason: "regular_user",
               }
            );
         }
      }

      next();
   } catch (error) {
      console.error("❌ Error detecting user role:", error);
      next(); // Continue with default behavior
   }
};

/**
 * Set default schema and pool context if none detected
 */
export const setDefaultSchema = (req, res, next) => {
   // If no pool context set yet, use default
   if (!req.session?.poolContext) {
      const defaultSchema = process.env.SEED_SCHEMA || "client_template";

      setPoolContext(req, POOL_CONTEXTS.DEFAULT, defaultSchema, {
         fallback: true,
         reason: "no_specific_context",
         user_role: USER_ROLES.USER,
      });
   } else if (req.session.schema && !req.schema) {
      // Ensure req.schema is set from session
      req.schema = req.session.schema;
   }

   next();
};

/**
 * Combined middleware that tries all detection methods in priority order
 */
export const detectSchema = async (req, res, next) => {
   try {
      // 1. Try API token first (highest priority - server-to-server)
      await detectSchemaFromApiToken(req, res, () => {});

      // 2. If no API context, try return_url (frontend proxy mode - tenant users)
      if (!req.session?.poolContext) {
         await detectSchemaFromReturnUrl(req, res, () => {});
      }

      // 3. If no specific context, detect user role (admin/owner/user)
      if (!req.session?.poolContext) {
         await detectUserRole(req, res, () => {});
      }

      // 4. Set default if still no context
      setDefaultSchema(req, res, next);
   } catch (error) {
      console.error("❌ Error in schema detection:", error);
      setDefaultSchema(req, res, next);
   }
};

/**
 * Get schema from request (session or API context)
 */
export const getSchemaFromRequest = (req) => {
   return (
      req.schema ||
      req.session?.schema ||
      process.env.SEED_SCHEMA ||
      "client_template"
   );
};

/**
 * Get user role from session metadata
 */
export const getUserRole = (req) => {
   return req.session?.poolMetadata?.user_role || USER_ROLES.USER;
};

/**
 * Check if user is system admin
 */
export const isSystemAdmin = (req) => {
   return getUserRole(req) === USER_ROLES.ADMIN;
};

/**
 * Check if user is client server owner
 */
export const isClientOwner = (req) => {
   return getUserRole(req) === USER_ROLES.OWNER;
};

/**
 * Check if user is tenant user
 */
export const isTenantUser = (req) => {
   return getUserRole(req) === USER_ROLES.USER;
};

/**
 * Get pool context information for debugging/logging
 */
export const getPoolContextInfo = (req) => {
   return {
      poolContext: req.session?.poolContext,
      schema: req.session?.schema,
      metadata: req.session?.poolMetadata,
      userId: req.session?.userId,
      userRole: getUserRole(req),
   };
};

/**
 * Middleware to log pool context (useful for debugging)
 */
export const logPoolContext = (req, res, next) => {
   if (process.env.NODE_ENV === "development") {
      const context = getPoolContextInfo(req);
      console.log("📊 Current Pool Context:", context);
   }
   next();
};

export default {
   detectSchemaFromReturnUrl,
   detectSchemaFromApiToken,
   detectUserRole,
   setDefaultSchema,
   detectSchema,
   getSchemaFromRequest,
   resolvePoolFromSession,
   getPoolContextInfo,
   logPoolContext,
   getUserRole,
   isSystemAdmin,
   isClientOwner,
   isTenantUser,
   POOL_CONTEXTS,
   USER_ROLES,
};
