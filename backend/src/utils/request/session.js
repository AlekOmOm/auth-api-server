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
 * @param {string[]} (opt) allowedUrls - Allowed URLs
 * @returns {Object} session object
 *
 */
export const setObj = (
   req,
   {
      userId = null,
      role = null,
      schema,
      ownerId = null,
      sessionId = null,
      isAuthenticated = undefined,
      allowedUrls = null,
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
   req.session.ownerId = ownerId !== null ? ownerId : req.session.ownerId;
   req.session.sessionId =
      sessionId !== null ? sessionId : req.session.sessionId;
   req.session.isAuthenticated =
      isAuthenticated !== undefined
         ? isAuthenticated
         : req.session.isAuthenticated;
   req.session.allowedUrls =
      allowedUrls !== null ? allowedUrls : req.session.allowedUrls;
};

/**
 * retrieve sessionId from session
 * @param {Object} session - Express session object
 * @returns {string} sessionId || undefined
 */
export function getSessionId(session) {
   return session?.sessionId; // undefined if not set
}

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
   check(session, "Session is required");
   check(schema, "Schema is required");
   session.schema = schema;
}

/**
 * set ownerId in session
 */
export function setOwnerId(session, ownerId) {
   check(session, "Session is required");
   check(ownerId, "Owner ID is required");
   session.ownerId = ownerId;
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
 * @param {Object} req - Express request object
 * @returns {string} user role || undefined
 */
export const getUserRole = (req) => {
   return req.session?.role || undefined;
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

// ---- helper functions ----

/**
 * @description check if value is defined
 * @param {*} value
 * @param {string} message
 * @returns {void}
 */
function check(value, message) {
   if (!value) {
      throw new ValidationError(message);
   }
}

// --- export ---
const sessionUtils = {
   setObj,
   getSchema,
   setSchema,
   getSessionId,
   setOwnerId,
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
