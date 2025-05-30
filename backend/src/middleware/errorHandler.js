import { standardizeResponse } from "../utils/responseUtils.js"; // Import the new utility

/**
 * Global error handling middleware
 * Standardizes error responses across the application using standardizeResponse utility.
 */
export function errorHandler(err, req, res, next) {
   // Log the full error stack for server-side debugging
   console.error("Global Error Handler Caught:", err);

   // Use standardizeResponse to create the error payload
   // The statusCode for the HTTP response will be taken from err.statusCode or default to 500
   const standardizedError = standardizeResponse({
      error: err,
      // message: err.message, // standardizeResponse handles this
      // statusCode: err.statusCode // standardizeResponse handles this
   });

   // The status for the HTTP response itself
   const responseStatus = err.statusCode || 500;

   // Send the standardized JSON response
   // The `standardizedError` object already contains `success: false`, `message`, and optionally `errors`
   // We don't want to send the `status` property from standardizeResponse in the JSON body if it's just for HTTP status.
   // Let's ensure the JSON body is clean.
   const { status, ...errorPayload } = standardizedError; // Remove status from payload if it was added for HTTP status decision

   return res.status(responseStatus).json(errorPayload);
}

// Custom error class for authentication errors
export class AuthError extends Error {
   constructor(message = "Authentication required") {
      super(message);
      this.name = "AuthError";
      this.statusCode = 401;
   }
}

// Custom error class for validation errors
export class ValidationError extends Error {
   constructor(message = "Validation Error", errors = []) {
      super(message);
      this.name = "ValidationError";
      this.statusCode = 400;
      // Ensure errors is always an array, even if a single error string/object is passed.
      this.errors = Array.isArray(errors) ? errors : errors ? [errors] : [];
   }
}

// Custom error class for not found errors
export class NotFoundError extends Error {
   constructor(message = "Resource not found") {
      super(message);
      this.name = "NotFoundError";
      this.statusCode = 404;
   }
}

// If you intend to only have one export from this file (the middleware function itself)
// then `export default function errorHandler(err, req, res, next) { ... }` is also an option.
// For now, keeping the named export `export function errorHandler` as primary.
