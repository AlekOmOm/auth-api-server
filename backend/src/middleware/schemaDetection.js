import { verifyApiToken } from "../services/clientServerService.js";
import * as clientServersRepo from "../db/repositories/clientServersRepository.js";
import { Pool } from "pg";
import config from "../utils/config.js";
import { ddl as authInternalDDL } from "../db/schemas/auth_internal/client_servers.js";
import getPool from "../db/connection/auth.js";

/**
 * Middleware to detect and set database schema in session/request context
 * Handles multiple scenarios:
 * 1. Frontend-Login-Proxy mode (return_url parameter)
 * 2. API-Auth-Server mode (Bearer token)
 * 3. Default/admin mode (fallback to SEED_SCHEMA)
 */

/**
 * Detect schema from return_url parameter for Frontend-Login-Proxy mode
 */
export const detectSchemaFromReturnUrl = async (req, res, next) => {
   try {
      const { return_url } = req.query;

      if (return_url) {
         // Parse the return_url to find matching client server
         const authInternalPool = await getPool();

         // Get all client servers and find the one with matching allowed_return_urls
         const { rows: clientServers } = await authInternalPool.query(
            "SELECT * FROM client_servers"
         );

         const matchingClient = clientServers.find((client) =>
            client.allowed_return_urls.some((allowedUrl) =>
               return_url.startsWith(allowedUrl)
            )
         );

         if (matchingClient) {
            req.session.schema = matchingClient.assigned_schema_name;
            req.session.client_id = matchingClient.client_id;
            req.schema = matchingClient.assigned_schema_name;
            console.log(
               `Schema detected from return_url: ${matchingClient.assigned_schema_name}`
            );
         }
      }

      next();
   } catch (error) {
      console.error("Error detecting schema from return_url:", error);
      next(); // Continue with default behavior
   }
};

/**
 * Detect schema from API Bearer token for API-Auth-Server mode
 */
export const detectSchemaFromApiToken = async (req, res, next) => {
   try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith("Bearer ")) {
         const token = authHeader.substring(7);

         try {
            const clientInfo = await verifyApiToken(token);
            req.schema = clientInfo.schema;
            req.clientContext = clientInfo;
            console.log(`Schema detected from API token: ${clientInfo.schema}`);
         } catch (tokenError) {
            // Invalid token, continue without setting schema
            console.log("Invalid API token, using default schema");
         }
      }

      next();
   } catch (error) {
      console.error("Error detecting schema from API token:", error);
      next(); // Continue with default behavior
   }
};

/**
 * Set default schema if none detected
 */
export const setDefaultSchema = (req, res, next) => {
   // If no schema set yet, use default
   if (!req.schema && !req.session.schema) {
      req.session.schema = process.env.SEED_SCHEMA || "client_template";
      req.schema = req.session.schema;
      console.log(`Using default schema: ${req.schema}`);
   } else if (req.session.schema && !req.schema) {
      // Use schema from session if available
      req.schema = req.session.schema;
   }

   next();
};

/**
 * Combined middleware that tries all detection methods
 */
export const detectSchema = async (req, res, next) => {
   // Try API token first (for API mode)
   await detectSchemaFromApiToken(req, res, () => {});

   // --- frontend proxy mode ---
   // if secret_key

   // If no schema yet, try return_url (for frontend proxy mode)
   if (!req.schema) {
      await detectSchemaFromReturnUrl(req, res, () => {});
   }

   // Set default if still no schema
   setDefaultSchema(req, res, next);
};

/**
 * Get schema from request (session or API context)
 */
export const getSchemaFromRequest = (req) => {
   return (
      req.schema ||
      req.session?.schema ||
      process.env.SEED_SCHEMA ||
      "client_template"
   );
};

export default {
   detectSchemaFromReturnUrl,
   detectSchemaFromApiToken,
   setDefaultSchema,
   detectSchema,
   getSchemaFromRequest,
};
