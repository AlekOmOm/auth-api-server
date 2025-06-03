import { POOL_CONTEXTS } from "./pool.js";
import { ValidationError } from "../middleware/errorHandler.js";
/**
 * setObj()
 *
 * @param {Object} req - Express request object
 * @param {string} (opt) userId - Authenticated user ID
 * @param {string} (opt) role - User role/permissions
 * @param {string} schema - Database schema (tenant)
 * @param {string} (opt) sessionId - Unique session identifier
 * @param {boolean} (opt) isAuthenticated - Authentication status
 * @returns {Object} session object
 *
 */
export const setObj = (
   req,
   {
      userId = null,
      role = null,
      schema,
      sessionId = null,
      isAuthenticated = undefined,
   }
) => {
   if (!req.session) {
      req.session = {};
   }

   /**
    * update
    * - each property if provided (i.e. if !== null)
    * - otherwise use existing value
    */
   req.session.userId = userId !== null ? userId : req.session.userId;
   req.session.role = role !== null ? role : req.session.role;
   req.session.schema = schema !== null ? schema : req.session.schema;
   req.session.sessionId =
      sessionId !== null ? sessionId : req.session.sessionId;
   req.session.isAuthenticated =
      isAuthenticated !== undefined
         ? isAuthenticated
         : req.session.isAuthenticated;
};
/**
 * retrieve userId from session
 */
export function getUserId(session) {
   try {
      const userId = session?.userId;
      if (!userId) {
         throw new ValidationError("User ID is required");
      }
      return userId;
   } catch (error) {
      throw error;
   }
}

/**
 * retrieve clientId from session
 */
export function getClientId(session) {
   try {
      const clientId = session?.clientId;
      if (!clientId) {
         throw new ValidationError("Client ID is required");
      }
      return clientId;
   } catch (error) {
      throw error;
   }
}

/**
 * retrieve clientSecretHash from session
 */
export function getClientSecretHash(session) {
   return session?.clientSecretHash;
}

/**
 * retrieve schema from session
 */
export function getSchema(session) {
   return session?.schema;
}

/**
 * @param {Object} session - Express session object
 * @param {string} schema - Database schema (tenant)
 * @returns {void} - updates session object
 */
export function setSchema(session, schema) {
   if (!session) {
      throw new ValidationError("Session is required");
   }
   if (!schema) {
      throw new ValidationError("Schema is required");
   }
   session.schema = schema;
}

/**
 * retrieve clientMode from session
 */
export function getClientMode(session) {
   return session?.clientMode;
}

/**
 * retrieve session data
 */
export function getSession(req) {
   return req.session || {};
}
/**
 * Get user role from session metadata
 */
export const getUserRole = (req) => {
   return req.session?.role || USER_ROLES.USER;
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

// --- export ---
const sessionUtils = {
   setObj,
   getSchema,
   setSchema,
   getUserId,
   getClientId,
   getClientSecretHash,
   getClientMode,
   getSession,
   getUserRole,
   isSystemAdmin,
   isClientOwner,
   isTenantUser,
};
export default sessionUtils;
