import { ValidationError } from "../middleware/errorHandler.js";

/**
 * get refererUrl from request body
 * @param {Object} req - express request object
 *  - body.refererUrl:
 *   {
 *      url: string,
 *   }
 * @returns {string} refererUrl
 */
export const getRefererUrl = (req) => {
   try {
      const refererUrl = req.body?.refererUrl;
      if (!refererUrl) {
         throw new ValidationError("Referer URL is required");
      }
      return refererUrl;
   } catch (error) {
      throw error;
   }
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
