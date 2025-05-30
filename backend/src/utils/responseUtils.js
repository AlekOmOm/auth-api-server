/**
 * Utility for standardizing API responses.
 */

/**
 * Standardizes the API response structure.
 *
 * @param {Object} params - The parameters for standardizing the response.
 * @param {any} [params.data=null] - The data payload for a successful response.
 * @param {Error} [params.error=null] - The error object for a failed response.
 * @param {string} [params.message=''] - An optional message to include in the response.
 *                                     If an error is provided and message is empty, error.message will be used.
 * @param {number} [params.statusCode=null] - An optional HTTP status code, primarily for error responses.
 *                                           If an error is provided and has a statusCode, that will be used.
 * @returns {Object} A standardized response object (e.g., { success: boolean, message: string, data?: any, errors?: any }).
 */
export function standardizeResponse({
   data = null,
   error = null,
   message = "",
   statusCode = null,
}) {
   if (error) {
      const resMessage =
         message || error.message || "An unexpected error occurred.";
      const resStatus = statusCode || error.statusCode || 500; // Internal Server Error default

      const response = {
         success: false,
         message: resMessage,
         status: resStatus, // Keep status for potential use in errorHandler
      };
      // If the error object has an 'errors' property (like from express-validator)
      if (error.errors) {
         response.errors = error.errors;
      }
      return response;
   }

   // Success response
   return {
      success: true,
      message: message || "Operation successful.",
      ...(data !== null && { data }), // Conditionally add data if it's not null
   };
}
