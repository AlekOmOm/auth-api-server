// import { standardizeResponse } from "../utils/responseUtils.js"; // This import might become unused
import clientServerService from "../services/clientServer.js"; // For fetching client-specific error context
import config from "../config/env.js"; // To access SCHEMAS constants
const SCHEMAS = config.SCHEMAS;

/**
 * Global error handling middleware
 * Standardizes error responses across the application.
 */
export async function errorHandler(err, req, res, next) {
   let clientErrorContext = null;
   if (
      err.schemaContext &&
      err.schemaContext !== SCHEMAS.AUTH_NAME &&
      err.schemaContext !== SCHEMAS.TEMPLATE_NAME
   ) {
      try {
         clientErrorContext =
            await clientServerService.getClientContextForError(
               err.schemaContext
            );
      } catch (serviceError) {
         console.error(
            "[ErrorHandler] Failed to fetch client context for error:",
            serviceError
         );
         // Don't let this secondary error prevent the original error from being handled
      }
   }

   // Enhanced logging for server-side debugging
   console.error(
      "Global Error Handler Caught:",
      err.name || "Error",
      err.message || "No message",
      {
         statusCode: err.statusCode,
         errorSchemaContext: err.schemaContext, // Log schema from error instance itself
         requestSchemaContext: req.schema, // Log schema from the request object (detected schema for the request)
         errorDetails: err.details, // Log custom details from error instance
         validationErrors: err.errors, // Log specific validation errors if present on err.errors
         retrievedClientErrorContext: clientErrorContext, // Log fetched client context
      },
      err.stack || "No stack trace"
   );

   const statusCode = err.statusCode || 500;
   let responseMessage = err.message || "Internal Server Error";

   // For client-facing errors, ensure message is safe to send
   // In development, always show the original message for easier debugging.
   const isDevelopment = process.env.NODE_ENV === "development";
   if (statusCode >= 500 && !isDevelopment) {
      responseMessage = "An unexpected error occurred. Please try again later.";
   }

   const errorResponse = {
      message: responseMessage,
   };

   // For ValidationErrors, the .errors property (already an array of objects {message, field})
   // should be directly assigned to the top-level errors field in the response, as per OpenAPI.
   if (
      err.name === "ValidationError" &&
      err.errors &&
      Array.isArray(err.errors) &&
      err.errors.length > 0
   ) {
      errorResponse.errors = err.errors;
   } else if (
      err.errors &&
      Array.isArray(err.errors) &&
      err.errors.length > 0
   ) {
      // For other error types that might have an .errors array (e.g. a multi-part non-validation error)
      // map them to the standard structure if they are not already.
      // This part might be less common if .errors is primarily for ValidationError.
      errorResponse.errors = err.errors.map((errorDetail) => {
         if (typeof errorDetail === "string") {
            return { message: errorDetail };
         }
         return {
            message: errorDetail.message || String(errorDetail),
            field: errorDetail.field, // Will be undefined if not present
         };
      });
   }

   if (isDevelopment) {
      errorResponse.debug = {
         originalMessage: err.message || "N/A",
         errorType: err.name || "Error",
         statusCode: err.statusCode || 500,
         requestSchemaContext:
            req.schema || "Schema not detected on request object",
         errorSchemaContext: err.schemaContext || null, // Schema passed to the error constructor
         errorDetails: err.details || null, // Custom details passed to the error constructor
         // Explicitly include validation errors in debug if it's a ValidationError
         validationErrors:
            err.name === "ValidationError" &&
            err.errors &&
            err.errors.length > 0
               ? err.errors
               : null,
         stack: err.stack || "Stack trace not available",
         clientErrorContext: clientErrorContext, // Include fetched client context in debug response
      };
   }

   // Send the JSON response
   res.status(statusCode).json(errorResponse);
}

// Custom error class for authentication errors
export class AuthError extends Error {
   constructor(
      message = "Authentication required",
      schemaContext = null,
      details = null
   ) {
      super(message);
      this.name = "AuthError";
      this.statusCode = 401;
      this.schemaContext = schemaContext;
      this.details = details;
   }
}

// Custom error class for validation errors
export class ValidationError extends Error {
   constructor(
      message = "Validation Error",
      errors = [],
      schemaContext = null,
      details = null
   ) {
      super(message);
      this.name = "ValidationError";
      this.statusCode = 400;
      // Ensure errors is always an array of {message, field} objects or can be processed into it
      this.errors = Array.isArray(errors)
         ? errors.map((e) => (typeof e === "string" ? { message: e } : e))
         : errors
         ? [{ message: String(errors) }]
         : [];
      this.schemaContext = schemaContext;
      this.details = details;
   }
}

// Custom error class for not found errors
export class NotFoundError extends Error {
   constructor(
      message = "Resource not found",
      schemaContext = null,
      details = null
   ) {
      super(message);
      this.name = "NotFoundError";
      this.statusCode = 404;
      this.schemaContext = schemaContext;
      this.details = details;
   }
}

// Custom error class for conflict errors
export class ConflictError extends Error {
   constructor(message = "Conflict", schemaContext = null, details = null) {
      super(message);
      this.name = "ConflictError";
      this.statusCode = 409;
      this.schemaContext = schemaContext;
      this.details = details;
   }
}

// If you intend to only have one export from this file (the middleware function itself)
// then `export default function errorHandler(err, req, res, next) { ... }` is also an option.
// For now, keeping the named export `export function errorHandler` as primary.
