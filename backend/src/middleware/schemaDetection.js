import { verifyApiToken } from "../services/clientServerService.js";
import * as clientServersRepo from "../repo/repositories/clientServersRepository.js";
import paths from "../config/paths.js";
import config from "../config/env.js";
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

      // Always call next() for this sub-middleware, as the orchestrator (detectSchema)
      // will decide the next overall step or if a default is needed.
      console.log(
         "🔍 [SCHEMA DETECTION FROM RETURN URL] Completed, calling its next()"
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
               user_role: USER_ROLES.API_CLIENT,
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
      if (req.session?.userId) {
         // Always check for role updates, not just when no context exists
         const userRole = req.session?.role;

         // Check if user owns any client servers
         const authInternalPool = await getPool();
         const { rows: userClients } = await authInternalPool.query(
            "SELECT COUNT(*) as client_count FROM client_servers WHERE user_id = $1",
            [req.session.userId]
         );

         // Update role based on current ownership status
         if (userClients[0]?.client_count > 0) {
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               user_id: req.session.userId,
               user_role: USER_ROLES.OWNER,
               owned_clients: userClients[0].client_count,
            });
         } else if (userRole === "admin") {
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               user_id: req.session.userId,
               user_role: USER_ROLES.ADMIN,
               system_admin: true,
            });
         } else {
            // Regular user - use default tenant pool
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
      next();
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
      const returnUrlFromBody = req.body?.returnUrl;
      const returnUrlFromQuery = req.query?.return_url;
      const effectiveReturnUrl = returnUrlFromBody || returnUrlFromQuery;

      // DEBUG: Enhanced session debugging to track session IDs
      console.log("🔍 [DETECT SCHEMA] Enhanced session state:", {
         path: req.path,
         method: req.method,
         origin: req.headers.origin,
         referer: req.headers.referer,
         userAgent: req.headers["user-agent"]?.substring(0, 50) + "...",
         sessionId: req.sessionID,
         sessionExists: !!req.session,
         userId: req.session?.userId,
         role: req.session?.role,
         poolContext: req.session?.poolContext,
         schema: req.session?.schema,
         poolMetadata: req.session?.poolMetadata,
         effectiveReturnUrl,
         cookies: req.headers.cookie
            ? req.headers.cookie.substring(0, 100) + "..."
            : "none",
      });

      if (req.session?.userId && req.session?.role) {
         console.log(
            "📊 detectSchema: Found authenticated user, checking session preservation...",
            {
               sessionId: req.sessionID,
               userId: req.session.userId,
               role: req.session.role,
            }
         );

         // Check if session has valid context that should be preserved
         if (req.session?.poolContext && req.session?.schema) {
            console.log(
               "📊 detectSchema: PRESERVING existing session context for authenticated user:",
               {
                  sessionId: req.sessionID,
                  userId: req.session.userId,
                  role: req.session.role,
                  poolContext: req.session.poolContext,
                  schema: req.session.schema,
                  path: req.path,
               }
            );

            // ADDITIONAL FIX: Ensure req.schema is set for downstream middleware
            req.schema = req.session.schema;

            // Session already has valid context, preserve it and skip detection
            next();
            return;
         }

         // If authenticated user has incomplete session context, restore from role
         console.log(
            "📊 detectSchema: Restoring session context for authenticated user with incomplete context:",
            {
               sessionId: req.sessionID,
               userId: req.session.userId,
               role: req.session.role,
               path: req.path,
               hasPoolContext: !!req.session.poolContext,
               hasSchema: !!req.session.schema,
            }
         );

         if (req.session.role === "owner") {
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               user_id: req.session.userId,
               user_role: USER_ROLES.OWNER,
               reason: "session_restoration_owner",
            });
         } else if (req.session.role === "admin") {
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               user_id: req.session.userId,
               user_role: USER_ROLES.ADMIN,
               reason: "session_restoration_admin",
            });
         } else {
            setPoolContext(
               req,
               POOL_CONTEXTS.DEFAULT,
               process.env.SEED_SCHEMA || "client_template",
               {
                  user_id: req.session.userId,
                  user_role: USER_ROLES.USER,
                  reason: "session_restoration_user",
               }
            );
         }

         console.log("📊 detectSchema: Session context restored:", {
            sessionId: req.sessionID,
            poolContext: req.session.poolContext,
            schema: req.session.schema,
         });

         // ADDITIONAL FIX: Ensure req.schema is set for downstream middleware
         req.schema = req.session.schema;

         next();
         return;
      }

      // Only run full detection for unauthenticated users or users without sessions
      console.log(
         "📊 detectSchema: Running full detection for unauthenticated user"
      );

      // Initialize: no context set yet
      if (req.session && req.session.poolContext) {
         // If coming from a previous middleware in the same request that already set it,
         // for now, we'll assume it was intentional and preserve it.
         // However, this schema detection is usually early in the chain.
         // Consider clearing or logging if context is unexpectedly pre-set.
      }

      // Path 1: Explicit internal Auth System pages (targeted by returnUrl for login)
      // Allow overriding if current context is DEFAULT
      if (
         (!req.session?.poolContext ||
            req.session?.poolContext === POOL_CONTEXTS.DEFAULT) &&
         (effectiveReturnUrl === "/owner" || effectiveReturnUrl === "/admin")
      ) {
         setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
            reason: "internal_auth_system_page_target_override_default",
            target_page: effectiveReturnUrl,
            user_role:
               effectiveReturnUrl === "/owner"
                  ? USER_ROLES.OWNER
                  : USER_ROLES.ADMIN, // Tentative role
         });
         console.log(
            "📊 detectSchema: Path 1 - Set AUTH_INTERNAL for internal page target (overrode default if present)",
            effectiveReturnUrl,
            "New context:",
            req.session.poolContext,
            req.session.schema
         );
      }

      // Path 2: Client-specific return_url (if not an internal page target and no specific context yet)
      if (
         !req.session?.poolContext ||
         req.session?.poolContext === POOL_CONTEXTS.DEFAULT
      ) {
         if (
            effectiveReturnUrl &&
            !(
               effectiveReturnUrl === "/owner" ||
               effectiveReturnUrl === "/admin"
            )
         ) {
            if (returnUrlFromQuery && !req.body.returnUrl)
               req.body.returnUrl = returnUrlFromQuery; // Normalize
            await new Promise((resolve) =>
               detectSchemaFromReturnUrl(req, res, resolve)
            );
            console.log(
               "📊 detectSchema: Path 2 - Attempted client return_url. Context after:",
               req.session.poolContext,
               req.session.schema
            );
         }
      }

      // Path 3: API Token (if no specific context yet or still default)
      if (
         !req.session?.poolContext ||
         req.session?.poolContext === POOL_CONTEXTS.DEFAULT
      ) {
         await new Promise((resolve) =>
            detectSchemaFromApiToken(req, res, resolve)
         );
         console.log(
            "📊 detectSchema: Path 3 - Attempted API token. Context after:",
            req.session.poolContext,
            req.session.schema
         );
      }

      // Path 4: Role of already logged-in user (for subsequent requests)
      // Only run if no specific context is set, to avoid overwriting AUTH_INTERNAL or CLIENT_TENANT contexts
      if (
         req.session?.userId &&
         (!req.session?.poolContext ||
            req.session?.poolContext === POOL_CONTEXTS.DEFAULT)
      ) {
         await new Promise((resolve) => detectUserRole(req, res, resolve));
         console.log(
            "📊 detectSchema: Path 4 - Attempted user role detection. Context after:",
            req.session.poolContext,
            req.session.schema
         );
      }

      // Path 5: Defaulting logic for direct interactions or true fallbacks
      // Only apply if context is still not specifically set (i.e., not AUTH_INTERNAL, CLIENT_TENANT, or API_CLIENT)
      if (
         !req.session?.poolContext ||
         req.session?.poolContext === POOL_CONTEXTS.DEFAULT
      ) {
         const isDirectAuthApiRoute =
            !effectiveReturnUrl &&
            (req.path.startsWith("/api/auth/login") ||
               req.path.startsWith("/api/auth/register"));
         // Check for direct GET requests to /login or /register pages themselves
         const isDirectAuthPageRoute =
            !effectiveReturnUrl &&
            (req.path === "/login" || req.path === "/register");

         if (isDirectAuthApiRoute || isDirectAuthPageRoute) {
            // User is directly on auth system's login/register page/API. Operations should target auth_internal.
            setPoolContext(req, POOL_CONTEXTS.AUTH_INTERNAL, "auth_internal", {
               reason: "direct_auth_system_interaction_default",
               user_role: USER_ROLES.USER, // Initial role, to be elevated by authService or client creation
            });
            console.log(
               "📊 detectSchema: Path 5a - Defaulted to AUTH_INTERNAL for direct auth route:",
               req.path
            );
         } else {
            // Ultimate fallback: if no context is set by any other means
            // (e.g., unmatched client return_url on a non-login/reg path, or completely unknown route).
            await new Promise((resolve) => setDefaultSchema(req, res, resolve));
            console.log(
               "📊 detectSchema: Path 5b - Defaulted using setDefaultSchema (client_template). Path:",
               req.path
            );
         }
      }

      // Log the final determined context if in development
      if (process.env.NODE_ENV === "development") {
         const finalContext = getPoolContextInfo(req);
         console.log(
            "📊 Final Determined Pool Context by detectSchema:",
            finalContext
         );
      }

      next(); // Pass control to the next middleware in the main Express chain
   } catch (error) {
      console.error("❌ Error in schema detection orchestrator:", error);
      // Critical error in detection, try to set a safe default and proceed
      try {
         await new Promise((resolve) => setDefaultSchema(req, res, resolve));
      } catch (setDefaultError) {
         console.error(
            "❌ Failed to set default schema after orchestrator error:",
            setDefaultError
         );
         // If setDefaultSchema also fails, there's little more we can do here in middleware
      }
      next(error); // Pass the original error to Express error handling
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
