/**
 * Utility functions for authentication
 */

/**
 * Removes password from user object
 * @param {Object} user - User object
 * @returns {Object} User object without password
 */
export function removePasswordFromUser(user) {
   if (!user) return null;

   const { password, password_hash, ...filteredUser } = user;
   return filteredUser;
}
