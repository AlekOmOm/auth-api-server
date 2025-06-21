/**
 * Session Helper Utilities
 *
 * Utilities for working with the enhanced session data from the authentication
 * and role detection system. Provides helpers for role checking, ownership
 * validation, and session management.
 */

import authApi from "../services/authApi.js";

/**
 * User roles from the backend system
 */
export const USER_ROLES = {
   ADMIN: "admin",
   OWNER: "owner",
   USER: "user",
};

/**
 * Session state management
 */
let currentSession = null;

/**
 * Get the current session data
 * @returns {Object|null} Current session data or null if not available
 */
export const getCurrentSession = () => {
   return currentSession;
};

/**
 * Update the current session data
 * @param {Object} sessionData - New session data from login/auth responses
 */
export const updateSession = (sessionData) => {
   currentSession = sessionData;
};

/**
 * Clear the current session data
 */
export const clearSession = () => {
   currentSession = null;
};

/**
 * Fetch and update session data from the server
 * @returns {Promise<Object|null>} Current session data or null if failed
 */
export const refreshSession = async () => {
   try {
      const response = await authApi.getSession();
      if (response.success && response.data) {
         updateSession(response.data);
         return response.data;
      }
      return null;
   } catch (error) {
      console.error("Failed to refresh session:", error);
      return null;
   }
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
   return !!(
      currentSession?.isAuthenticated === true && currentSession?.userId
   );
};

/**
 * Check if user has a specific role
 * @param {string} role - Role to check (admin, owner, user)
 * @returns {boolean} True if user has the specified role
 */
export const hasRole = (role) => {
   return currentSession?.role === role;
};

/**
 * Check if user is an admin
 * @returns {boolean} True if user is an admin
 */
export const isAdmin = () => {
   return hasRole(USER_ROLES.ADMIN);
};

/**
 * Check if user is an owner
 * @returns {boolean} True if user is an owner
 */
export const isOwner = () => {
   return hasRole(USER_ROLES.OWNER);
};

/**
 * Check if user is an admin or owner
 * @returns {boolean} True if user is admin or owner
 */
export const isAdminOrOwner = () => {
   return isAdmin() || isOwner();
};

/**
 * Check if user owns the current resource
 * @returns {boolean} True if user owns the current resource
 */
export const ownsCurrentResource = () => {
   if (!currentSession?.userId || !currentSession?.ownerId) {
      return false;
   }
   return currentSession.userId === currentSession.ownerId;
};

/**
 * Get the current user's role
 * @returns {string|null} Current user role or null
 */
export const getCurrentRole = () => {
   return currentSession?.role || null;
};

/**
 * Get the current schema context
 * @returns {string|null} Current schema or null
 */
export const getCurrentSchema = () => {
   return currentSession?.schema || null;
};

/**
 * Get the current user ID
 * @returns {string|null} Current user ID or null
 */
export const getCurrentUserId = () => {
   return currentSession?.userId || null;
};

/**
 * Get the current owner ID (of the resource being accessed)
 * @returns {string|null} Current owner ID or null
 */
export const getCurrentOwnerId = () => {
   return currentSession?.ownerId || null;
};

/**
 * Get allowed URLs for the current session
 * @returns {string[]} Array of allowed URLs
 */
export const getAllowedUrls = () => {
   return currentSession?.allowedUrls || [];
};

/**
 * Check if a URL is allowed for the current session
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is allowed
 */
export const isUrlAllowed = (url) => {
   const allowedUrls = getAllowedUrls();
   return allowedUrls.includes(url);
};

/**
 * Handle login response and update session
 * @param {Object} loginResponse - Response from authApi.login()
 * @returns {boolean} True if login was successful and session updated
 */
export const handleLoginResponse = (loginResponse) => {
   if (!loginResponse) {
      return false;
   }

   if (loginResponse.success && loginResponse.sessionUpdate) {
      updateSession(loginResponse.sessionUpdate);
      return true;
   }
   return false;
};

/**
 * Handle logout and clear session
 * @returns {Promise<boolean>} True if logout was successful
 */
export const handleLogout = async () => {
   try {
      const response = await authApi.logout();
      clearSession();
      return response.success;
   } catch (error) {
      console.error("Logout error:", error);
      clearSession(); // Clear session even if logout request fails
      return false;
   }
};

/**
 * Get session summary for debugging
 * @returns {Object} Session summary
 */
export const getSessionSummary = () => {
   if (!currentSession) {
      return { authenticated: false };
   }

   return {
      authenticated: isAuthenticated(),
      userId: getCurrentUserId(),
      role: getCurrentRole(),
      schema: getCurrentSchema(),
      ownerId: getCurrentOwnerId(),
      ownsResource: ownsCurrentResource(),
      isAdmin: isAdmin(),
      isOwner: isOwner(),
      isAdminOrOwner: isAdminOrOwner(),
   };
};

/**
 * Session helper object with all utilities
 */
const sessionHelper = {
   USER_ROLES,
   getCurrentSession,
   updateSession,
   clearSession,
   refreshSession,
   isAuthenticated,
   hasRole,
   isAdmin,
   isOwner,
   isAdminOrOwner,
   ownsCurrentResource,
   getCurrentRole,
   getCurrentSchema,
   getCurrentUserId,
   getCurrentOwnerId,
   getAllowedUrls,
   isUrlAllowed,
   handleLoginResponse,
   handleLogout,
   getSessionSummary,
};

export default sessionHelper;
