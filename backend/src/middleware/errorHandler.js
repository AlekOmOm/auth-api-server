/**
 * Global error handling middleware
 * Standardizes error responses across the application
 */
export function errorHandler(err, req, res, next) {
  console.error(err.stack);

  // Default error status and message
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Convert validation errors to a consistent format
  if (err.name === "ValidationError" || err.errors) {
    return res.status(400).json({
      message: "Validation Error",
      errors: Array.isArray(err.errors) ? err.errors : [{ message }],
    });
  }

  // Standard error response
  return res.status(status).json({
    message,
  });
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
    this.errors = errors;
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

export default errorHandler;
