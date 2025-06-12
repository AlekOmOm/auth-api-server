import { ValidationError } from "../../middleware/errorHandler.js";

/**
 * get refererUrl from request body
 * @param {Object} req - express request object
 * @returns {string|null} refererUrl or null if not present
 */
export const getRefererUrl = (req) => {
   return req.body?.refererUrl || null;
};

/**
 * get credentials from request body
 * @param {Object} req - express request object
 *  - body.credentials:
 *   {
 *      name: string,
 *      email: string,
 *      password: string,
 *   }
 * @returns {Object} credentials
 */
export const getCredentials = (req) => {
   try {
      const credentials = req.body?.credentials;
      if (!credentials) {
         throw new ValidationError("Credentials are required");
      }
      return credentials;
   } catch (error) {
      throw error;
   }
};

// --- export ---
export default {
   getRefererUrl,
   getCredentials,
};
