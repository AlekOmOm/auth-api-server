// src/utils/customErrors.js

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
