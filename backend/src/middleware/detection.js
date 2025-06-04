import { POOL_CONTEXTS } from "../utils/pool.js";
import { USER_ROLES } from "../utils/roles.js";
import * as service from "../services/clientServer.js";
import requestUtils from "../utils/request/index.js";

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
 *
 * ---
 * structure of req after detectSchema:
 * {
 *   session: {
 *     poolContext: string,
 *     schema: string,
 *     client_id: string,
 *     poolMetadata: {
 *       app_name: string,
 *       client_mode: string,
 *       return_url: string,
 *       allowed_return_urls: string[],
 *       user_role: string,
 *     },
 *   }
 * }
 */

/**
 * Combined middleware that tries all detection methods in priority order
 */
export const detectSchema = async (req, res, next) => {
   try {
      if (requestUtils.header.getApiToken(req)) {
         detectSchemaFromApiToken(req, res, next);
      }
      if (requestUtils.body.getRefererUrl(req)) {
         detectSchemaFromUrl(req, res, next);
      }
      detectUserRole(req, res, next);
      next();
   } catch (error) {
      console.error("❌ Error detecting schema:", error);
      next();
   }
};

/**
 * Detect schema from refererUrl for Frontend-Login-Proxy mode
 * Sets CLIENT_TENANT pool context (for tenant users)
 */
export const detectSchemaFromUrl = async (req, res, next) => {
   const url = requestUtils.body.getRefererUrl(req);
   const clientServerDetails = await executeIf(url, service.getByUrl, {
      url,
      schema: req.session.schema,
   });

   /**
    * clientServerDetails = {
    *    message: string,
    *    data: ClientServer {
    *       user_id: string,
    *       schema: string,
    *       authorized_urls: string[],
    *    }
    * }
    */
   if (clientServerDetails && clientServerDetails.schema) {
      requestUtils.session.setObj(req, clientServerDetails.data.toApiResponse());
   }
   next();
};

/**
 * Detect schema from API Bearer token for API-Auth-Server mode
 * Sets API_CLIENT pool context (for server-to-server calls)
 */
export const detectSchemaFromApiToken = async (req, res, next) => {
   const token = requestUtils.header.getApiToken(req);
   const tokenDetails = await executeIf(token, verifyApiToken, token);

   if (tokenDetails && tokenDetails.schema) {
      requestUtils.session.setObj(req, {
         userId: tokenDetails.user_id,
         role: requestUtils.session.getUserRole(req),
         schema: tokenDetails.schema,
         ownerId: tokenDetails.user_id,
         sessionId: requestUtils.session.getSessionId(req.session),
         isAuthenticated: requestUtils.session.isAuthenticated(req.session),
         allowedUrls: tokenDetails.authorized_urls,
      });
   }
   next();
};

/**
 * Detect user role and set appropriate context
 * - admin: System administrator (role = 'admin')
 * - owner: Client server owner (has client_servers records)
 * - user: Regular user (default)
 *
 * @context Pre-condition: user is authenticated (logged in)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const detectUserRole = async (req, res, next) => {
   try {
      const role = requestUtils.session.getUserRole(req);
      if (role) {
         return next();
      }

      // prep
      const userId = requestUtils.session.getUserId(req.session);

      // exec
      const userDetails = await executeIf(userId, service.getByUserId, userId);

      // post
      if (userDetails && userDetails.role) {
         requestUtils.session.setRole(req.session, userDetails.role);
      }
      next();
   } catch (error) {
      console.error("❌ Error detecting user role:", error);
      next();
   }
};

// --- helpers ---

/**
 * Execute a function if a condition is met
 * @param {any} condition - The condition to check (should be truthy to proceed)
 * @param {Function} fn - The async function to execute if the condition is met
 * @param  {...any} args - Arguments to pass to the function fn
 * @returns {Promise<any|null>} - The result of the function or null if the condition is not met or fn is not a function
 */
async function executeIf(condition, fn, ...args) {
   if (!condition) {
      return null;
   }
   if (typeof fn !== "function") {
      console.error(
         "executeIf was called with a non-function argument for 'fn'."
      );
      return null;
   }
   return await fn(...args);
}

// --- export
export default {
   detectSchema, // main
};
