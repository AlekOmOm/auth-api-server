import { POOL_CONTEXTS } from "../utils/pool.js";
import { USER_ROLES } from "../utils/roles.js";
import * as clientServerService from "../services/clientServer.js";
import authService from "../services/auth.js";
import requestUtils from "../utils/request/index.js";

export const detectSchema = async (req, res, next) => {
   const originalUserSessionSchemaIfExists =
      req.session?.userId && req.session?.schema ? req.session.schema : null;

   console.log(
      `[DETECT_SCHEMA_V3_ENTRY] Path: ${req.path}, Method: ${req.method}, Initial Session Schema: ${req.session?.schema}, Original User Session Schema (if logged in): ${originalUserSessionSchemaIfExists}`
   );
   try {
      const apiToken = requestUtils.header.getApiToken(req);
      const schemaContextHeader = req.headers["x-schema-context"];
      const explicitRefererUrl = req.body?.refererUrl || req.query?.refererUrl;
      const headerRefererUrl = req.headers.referer;

      let schemaContextRefererUrl = null;
      if (schemaContextHeader) {
         try {
            const parsedContext = JSON.parse(schemaContextHeader);
            schemaContextRefererUrl = parsedContext.refererUrl;
         } catch (parseError) {
            schemaContextRefererUrl = schemaContextHeader;
         }
      }

      if (apiToken) {
         console.log(
            "[DETECT_SCHEMA_V3_MAIN] API token found, attempting schema detection from token."
         );
         await detectSchemaFromApiToken(req, res, () => {});
      } else if (schemaContextRefererUrl) {
         console.log(
            `[DETECT_SCHEMA_V3_MAIN] X-Schema-Context Referer URL found: \"${schemaContextRefererUrl}\", attempting schema detection from URL.`
         );
         await detectSchemaFromUrl(req, res, () => {}, schemaContextRefererUrl);
      } else if (explicitRefererUrl) {
         console.log(
            `[DETECT_SCHEMA_V3_MAIN] Explicit Referer URL found: \"${explicitRefererUrl}\", attempting schema detection from URL.`
         );
         await detectSchemaFromUrl(req, res, () => {}, explicitRefererUrl);
      } else if (headerRefererUrl) {
         console.log(
            `[DETECT_SCHEMA_V3_MAIN] Header Referer URL found: \"${headerRefererUrl}\", attempting schema detection from URL.`
         );
         await detectSchemaFromUrl(req, res, () => {}, headerRefererUrl);
      } else {
         console.log(
            "[DETECT_SCHEMA_V3_MAIN] No API token or any Referer URL found in this request."
         );
      }

      // If we already have a session with a user logged in, preserve their schema for auth endpoints
      if (req.session?.userId && req.session?.schema && !req.schema) {
         const authPaths = [
            "/api/auth/session",
            "/api/auth/me",
            "/api/auth/admin",
            "/api/auth/sessions",
            "/api/auth/logout",
         ];
         const isAuthPath =
            authPaths.some((p) => req.path === p) ||
            req.path.startsWith("/api/auth/");

         if (isAuthPath) {
            req.schema = req.session.schema;
            console.log(
               `[DETECT_SCHEMA_V3_PRESERVE] Preserving user's session schema '${req.session.schema}' for auth path: ${req.path}`
            );
         }
      }

      if (!req.session?.schema) {
         const isRegisterPath = req.path === "/api/auth/register";
         const isLoginPath = req.path === "/api/auth/login";

         if (isRegisterPath || isLoginPath) {
            console.log(
               `[DETECT_SCHEMA_V3_FALLBACK] Path ${req.path} is a public auth endpoint. No fallback to 'auth_internal' by default.`
            );
            // For these paths, if no schema is found via token/referer,
            // req.session.schema will remain undefined here,
            // allowing validationSchemas.js to use clientUserValidationRules.
         } else {
            const internalApiPaths = [
               "/api/auth/", // Covers other /api/auth/* routes like /session, /logout if they need auth_internal
               "/api/owner/",
               "/api/clientServer/user/", // Example: an admin managing users for a client
               "/api/users",
               "/api/schema",
            ];
            const requiresAuthInternal = internalApiPaths.some((p) =>
               req.path.startsWith(p)
            );

            if (requiresAuthInternal) {
               req.session.schema = "auth_internal";
               console.log(
                  `[DETECT_SCHEMA_V3_FALLBACK] Path ${req.path} requires 'auth_internal'. Set req.session.schema to "auth_internal".`
               );
            } else {
               console.log(
                  `[DETECT_SCHEMA_V3_FALLBACK] Path ${req.path} does not match specific internal/owner/auth patterns for schema fallback to 'auth_internal'.`
               );
            }
         }
      }

      // Set req.schema based on priority:
      // 1. If req.schema is already set (e.g., from preserving session schema for auth endpoints)
      // 2. Otherwise use req.session.schema
      if (!req.schema && req.session?.schema) {
         req.schema = req.session.schema;
         console.log(
            `[DETECT_SCHEMA_V3_FINAL_SET] Set req.schema to \"${req.schema}\" from session for path: ${req.path}`
         );
      } else if (req.schema) {
         console.log(
            `[DETECT_SCHEMA_V3_FINAL_SET] req.schema already set to \"${req.schema}\" for path: ${req.path}`
         );
      } else {
         console.log(
            `[DETECT_SCHEMA_V3_WARN] req.schema is NOT set after all detection attempts for path: ${req.path}. Some operations might fail if schema is required.`
         );
      }

      if (
         req.session?.userId &&
         originalUserSessionSchemaIfExists &&
         req.schema
      ) {
         console.log(
            `[DETECT_SCHEMA_V3_VALIDATE_ACCESS] User ${req.session.userId} (original schema: ${originalUserSessionSchemaIfExists}) attempting to operate on target schema ${req.schema}.`
         );
         await authService.validateUserSchemaAccess(
            req.session.userId,
            originalUserSessionSchemaIfExists,
            req.schema
         );
         console.log(
            `[DETECT_SCHEMA_V3_VALIDATE_ACCESS] Access GRANTED for user ${req.session.userId} to schema ${req.schema}.`
         );
      } else if (
         req.session?.userId &&
         req.schema &&
         !originalUserSessionSchemaIfExists
      ) {
         console.warn(
            `[DETECT_SCHEMA_V3_VALIDATE_ACCESS_WARN] User ${req.session.userId} has session, target schema is '${req.schema}', but no originalUserSessionSchema was found. Proceeding with caution.`
         );
      }

      await detectUserRole(req, res, () => {});

      console.log(
         `[DETECT_SCHEMA_V3_EXIT] Path: ${req.path}, Final req.schema: \"${req.schema}\", Final req.session.role: \"${req.session?.role}\"`
      );
      next();
   } catch (error) {
      console.error(
         `❌ Error in detectSchema_V3 middleware for path ${req.path}:`,
         error.message
      );
      next(error);
   }
};

export const detectSchemaFromUrl = async (req, res, next, urlToDetect) => {
   console.log(
      `[DETECT_SCHEMA_FROM_URL_V3] Attempting for referer: \"${urlToDetect}\"`
   );
   if (!urlToDetect) {
      console.log("[DETECT_SCHEMA_FROM_URL_V3] No urlToDetect provided.");
      return next();
   }

   // Check if URL is from local auth-system frontend
   try {
      const url = new URL(urlToDetect);
      if (url.hostname === "localhost" && url.port === "3000") {
         console.log(
            "[DETECT_SCHEMA_FROM_URL_V3] Detected localhost:3000 (auth-system frontend). Using auth_internal schema."
         );
         req.session.schema = "auth_internal";
         // For auth_internal, we should preserve the existing session data
         return next();
      }
   } catch (urlError) {
      console.log(
         `[DETECT_SCHEMA_FROM_URL_V3] Invalid URL format: ${urlToDetect}`
      );
   }

   try {
      const clientServerDetails = await clientServerService.getByUrl({
         url: urlToDetect,
      });
      if (clientServerDetails && clientServerDetails.data) {
         const csData = clientServerDetails.data.toApiResponse
            ? clientServerDetails.data.toApiResponse()
            : clientServerDetails.data;
         console.log(
            `[DETECT_SCHEMA_FROM_URL_V3] Found client server by URL: ${csData.client_id}, Schema: ${csData.assigned_schema_name}`
         );
         req.session.schema = csData.assigned_schema_name || req.session.schema;
         req.session.ownerId = csData.ownerId || req.session.ownerId;
         req.session.allowedUrls =
            csData.authorized_urls || req.session.allowedUrls;
      } else {
         console.log(
            `[DETECT_SCHEMA_FROM_URL_V3] No client server found for URL: \"${urlToDetect}\". Falling back to auth_internal.`
         );
         req.session.schema = "auth_internal"; // Fallback to auth_internal
      }
   } catch (error) {
      console.error(
         `❌ Error in detectSchemaFromUrl_V3 for referer \"${urlToDetect}\":`,
         error.message,
         "Falling back to auth_internal."
      );
      req.session.schema = "auth_internal"; // Fallback to auth_internal on error
   }
   next();
};

export const detectSchemaFromApiToken = async (req, res, next) => {
   const token = requestUtils.header.getApiToken(req);
   console.log(
      `[DETECT_SCHEMA_FROM_API_TOKEN_V3] Attempting... Token present: ${!!token}`
   );
   if (!token) {
      return next();
   }
   try {
      const tokenDetails = await clientServerService.verifyApiToken({
         secretHash: token,
      });
      if (tokenDetails && tokenDetails.data) {
         const csData = tokenDetails.data.toApiResponse
            ? tokenDetails.data.toApiResponse()
            : tokenDetails.data;
         console.log(
            `[DETECT_SCHEMA_FROM_API_TOKEN_V3] Found client server by token: ${csData.client_id}, Schema: ${csData.assigned_schema_name}`
         );
         req.session.schema = csData.assigned_schema_name || req.session.schema;
         req.session.ownerId = csData.ownerId || req.session.ownerId;
      } else {
         console.log(
            "[DETECT_SCHEMA_FROM_API_TOKEN_V3] No client server found for provided token."
         );
      }
   } catch (error) {
      console.error("❌ Error in detectSchemaFromApiToken_V3:", error.message);
   }
   next();
};

export const detectUserRole = async (req, res, next) => {
   console.log(
      `[DETECT_USER_ROLE_V3_ENTRY] User: ${req.session?.userId}, Current Session Role: ${req.session?.role}, OwnerId in session: ${req.session?.ownerId}, Current req.session.schema: ${req.session?.schema}`
   );
   try {
      const userId = requestUtils.session.getUserId(req.session);
      const sessionRole = req.session.role;
      const ownerIdFromSession = req.session.ownerId;
      let determinedRole = USER_ROLES.USER;

      if (sessionRole === USER_ROLES.ADMIN) {
         determinedRole = USER_ROLES.ADMIN;
         console.log(
            "[DETECT_USER_ROLE_V3] Role is ADMIN (from prior session state)."
         );
      } else if (sessionRole === USER_ROLES.OWNER) {
         determinedRole = USER_ROLES.OWNER;
         console.log(
            "[DETECT_USER_ROLE_V3] Role is OWNER (from prior session state)."
         );
      }

      if (req.session.schema === "auth_internal") {
         if (userId && ownerIdFromSession && userId === ownerIdFromSession) {
            if (sessionRole === USER_ROLES.OWNER)
               determinedRole = USER_ROLES.OWNER;
            else if (sessionRole === USER_ROLES.ADMIN)
               determinedRole = USER_ROLES.ADMIN;
            else determinedRole = USER_ROLES.USER;
            console.log(
               `[DETECT_USER_ROLE_V3] In 'auth_internal'. Role based on session: ${determinedRole}`
            );
         } else if (
            userId &&
            (sessionRole === USER_ROLES.OWNER ||
               sessionRole === USER_ROLES.ADMIN)
         ) {
            determinedRole = sessionRole;
            console.log(
               `[DETECT_USER_ROLE_V3] In 'auth_internal'. Role confirmed from session: ${determinedRole}`
            );
         } else if (userId) {
            determinedRole = USER_ROLES.USER;
            console.log(
               `[DETECT_USER_ROLE_V3] In 'auth_internal'. UserID ${userId} present, but not owner/admin via session role. Setting to USER.`
            );
         } else {
            console.log(
               "[DETECT_USER_ROLE_V3] In 'auth_internal', no active user session. Defaulting role to USER (guest)."
            );
         }
      } else {
         if (userId && ownerIdFromSession && userId === ownerIdFromSession) {
            determinedRole = USER_ROLES.OWNER;
            console.log(
               `[DETECT_USER_ROLE_V3] In client schema '${req.session.schema}'. Role set to OWNER (userId matches client's ownerId).`
            );
         } else if (
            userId &&
            sessionRole === USER_ROLES.ADMIN &&
            req.session.schema !== "auth_internal"
         ) {
            determinedRole = USER_ROLES.USER;
            console.log(
               `[DETECT_USER_ROLE_V3] In client schema '${req.session.schema}'. Session role ADMIN, interpreting as USER for client context.`
            );
         } else if (userId) {
            determinedRole = USER_ROLES.USER;
            console.log(
               `[DETECT_USER_ROLE_V3] In client schema '${req.session.schema}'. Role set to USER.`
            );
         } else {
            console.log(
               `[DETECT_USER_ROLE_V3] In client schema '${req.session.schema}', no active user session. Defaulting role to USER (guest).`
            );
         }
      }

      req.session.role = determinedRole;
      console.log(
         `[DETECT_USER_ROLE_V3_EXIT] Final role for this request context: ${req.session.role}`
      );
   } catch (error) {
      if (error.message && error.message.includes("User ID is required")) {
         console.warn(
            "[DETECT_USER_ROLE_V3_WARN] User not authenticated or userId missing. Cannot determine role beyond guest/unauthenticated."
         );
      } else {
         console.error("❌ Error in detectUserRole_V3:", error.message);
      }
   }
   next();
};

export default {
   detectSchema,
   detectSchemaFromUrl,
   detectSchemaFromApiToken,
   detectUserRole,
};
