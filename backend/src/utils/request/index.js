import bodyUtils from "./body.js";
import sessionUtils from "./session.js";

/**
 * file: src/utils/request/index.js
 *
 * @description for request object handling
 *
 */

// --- functions ---

/**
 * Set default schema and pool context if none detected
 */
export const setDefaultSchema = (req, res, next) => {
   setSessionObject(req, {
      userId: null,
      role: null,
      schema: "auth_internal",
      sessionId: null,
      isAuthenticated: true,
   });
   next();
};

/**
 * Get schema from request (session or API context)
 */
export const getSchemaFromRequest = (req) => {
   return req.schema || req.session?.schema || "auth_internal";
};

// ------------------------------------------------------------------------------------------------

const headerUtils = {
   /**
    * Get API token from request headers
    * @param {Object} req - Express request object
    * @returns {string} API token | null
    */
   getApiToken: (req) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
         return null;
      }
      return authHeader.substring(7);
   },
};

// --- export ---
const requestUtils = {
   setDefaultSchema,
   getSchemaFromRequest,
   body: bodyUtils,
   session: sessionUtils,
   header: headerUtils,
};
export default requestUtils;
