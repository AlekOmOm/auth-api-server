import { POOL_CONTEXTS } from "../pool.js";
import { ValidationError } from "../../middleware/errorHandler.js";
import { USER_ROLES } from "../roles.js";
/**
 * setObj()
 *
 * @param {Object} req - Express request object
 * @param {string} (opt) userId - Authenticated user ID
 * @param {string} (opt) name - User name
 * @param {string} (opt) email - User email
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
      name = null,
      email = null,
      role = null,
      schema = null,
      ownerId = null,
      sessionId = null,
      isAuthenticated = undefined,
      allowedUrls = null,
   }
) => {
   /**
    * update
    * - each property if provided (i.e. if !== null)
    * - otherwise preserve existing value
    */
   if (userId !== null) req.session.userId = userId;
   if (name !== null) req.session.name = name;
   if (email !== null) req.session.email = email;
   if (role !== null) req.session.role = role;
   if (schema !== null) req.session.schema = schema;
   if (ownerId !== null) req.session.ownerId = ownerId;
   if (sessionId !== null) req.session.sessionId = sessionId;
   if (isAuthenticated !== undefined)
      req.session.isAuthenticated = isAuthenticated;
   if (allowedUrls !== null) req.session.allowedUrls = allowedUrls;
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

/**
 * set role in session
 */
export function setRole(session, role) {
   check(session, "Session is required");
   check(role, "Role is required");
   session.role = role;
}

/**
 * Check if session is authenticated
 */
export function isAuthenticated(session) {
   return session?.isAuthenticated === true && session?.userId;
}

/**
 * retrieve userName from session
 */
export function getUserName(session) {
   return session?.name;
}

/**
 * retrieve userEmail from session
 */
export function getUserEmail(session) {
   return session?.email;
}

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
   setRole,
   getUserId,
   getClientId,
   getClientSecretHash,
   getClientMode,
   getSession,
   getUserRole,
   isSystemAdmin,
   isClientOwner,
   isTenantUser,
   isAuthenticated,
   getUserName,
   getUserEmail,
};
export default sessionUtils;
