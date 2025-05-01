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

  const { password, ...filteredUser } = user;
  return filteredUser;
}

/**
 * Standardizes error responses
 * @param {Error} error - Error object
 * @returns {Object} Standardized error response
 */
export function standardizeErrorResponse(error) {
  return {
    message: error.message || "An error occurred",
    status: error.statusCode || 500,
  };
}

/**
 * Creates a standardized success response
 * @param {String} message - Success message
 * @param {*} data - Response data
 * @returns {Object} Standardized success response
 */
export function createSuccessResponse(message, data = null) {
  const response = {
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return response;
}
