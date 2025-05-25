import { AuthError } from "./errorHandler.js";
import { verifyApiToken } from "../services/clientServerService.js";

/**
 * Middleware to authenticate client server API requests
 * Verifies API token and sets client context
 */
export const authenticateClientServer = async (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         throw new AuthError("Authorization header with Bearer token required");
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      // Verify token and get client information
      const clientInfo = await verifyApiToken(token);

      // Set client context in request
      req.isClientServer = true;

      next();
   } catch (error) {
      next(error);
   }
};

/**
 * Middleware to check if return URL is allowed for client
 */
export const validateReturnUrl = (req, res, next) => {
   try {
      const { return_url } = req.query;
      const { allowed_return_urls } = req.clientContext;

      if (
         return_url &&
         !allowed_return_urls.some((url) => return_url.startsWith(url))
      ) {
         throw new AuthError("Return URL not allowed for this client");
      }

      next();
   } catch (error) {
      next(error);
   }
};

/**
 * Middleware to extract client schema from request context
 * Used for database operations
 */
export const setClientSchema = (req, res, next) => {
   if (req.clientContext && req.clientContext.schema) {
      req.schema = req.clientContext.schema;
   }
   next();
};

export default {
   authenticateClientServer,
   validateReturnUrl,
   setClientSchema,
};
