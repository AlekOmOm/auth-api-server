// --- services ---
import * as authService from "../services/auth.js";
// import * as clientServerService from "../services/clientServerService.js"; // clientServerService is used by authService directly
// --- utils ---
import * as sessionUtils from "../utils/session.js";
import { standardizeResponse } from "../utils/responseUtils.js"; // Import the new utility

// --- controller ---
/**
 * auth controller
 *   - register
 *   - login
 *   - logout
 *   - getCurrentUser
 *
 * All functions extract parameters from request and pass them to services
 */

/**
 * @description logic for registering a new user
 * Extracts user data and schema, then calls authService.register
 */
const register = async (req, res, next) => {
   try {
      const userData = req.body;
      const schema = sessionUtils.getSchema(req.session);
      const poolContext = sessionUtils.getPoolContext(req.session);
      const poolMetadata = sessionUtils.getPoolMetadata(req.session);
      const refererUrl = req.body.refererUrl;

      // Service now returns { message: string, data: object } or throws error
      const serviceResult = await authService.register({
         userData,
         schema,
         poolContext,
         poolMetadata,
         refererUrl,
      });

      // Controller formats the response
      res.status(201).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error); // Pass error to global error handler
   }
};

/**
 * @description logic for logging in
 * Extracts credentials and session data, then calls authService.login
 */
const login = async (req, res, next) => {
   try {
      const { credentials, returnUrl } = req.body;
      const schema = sessionUtils.getSchema(req.session);
      const poolContext = sessionUtils.getPoolContext(req.session);
      const poolMetadata = sessionUtils.getPoolMetadata(req.session);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers["user-agent"];

      if (!schema) {
         // For direct errors like this, we can still use standardizeResponse
         return res.status(400).json(
            standardizeResponse({
               error: new Error("Schema not found in session"),
               statusCode: 400,
            })
         );
      }
      if (!credentials) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("Credentials are required"),
               statusCode: 400,
            })
         );
      }

      // Service returns { message: string, data: object, sessionUpdate?: object } or throws
      const serviceResult = await authService.login({
         credentials,
         returnUrl,
         schema,
         poolContext,
         poolMetadata,
         session: req.session, // Pass the whole session for updates
         ipAddress,
         userAgent,
      });

      if (serviceResult.sessionUpdate) {
         Object.assign(req.session, serviceResult.sessionUpdate);
         // Do not send sessionUpdate to client via standardizeResponse data
         const { sessionUpdate, ...responseData } = serviceResult.data;
         res.status(200).json(
            standardizeResponse({
               data: responseData,
               message: serviceResult.message,
            })
         );
      } else {
         res.status(200).json(
            standardizeResponse({
               data: serviceResult.data,
               message: serviceResult.message,
            })
         );
      }
   } catch (error) {
      next(error);
   }
};

/**
 * @description logic for logging out
 * Extracts session data and calls authService.logout
 */
const logout = async (req, res, next) => {
   try {
      const userId = sessionUtils.getUserId(req.session);
      const schema = sessionUtils.getSchema(req.session);

      // Service returns { message: string } or throws
      const serviceResult = await authService.logout({
         userId,
         schema,
         destroySession: () => {
            return new Promise((resolve, reject) => {
               req.session.destroy((err) => {
                  if (err) reject(err);
                  else resolve();
               });
            });
         },
      });
      res.status(200).json(
         standardizeResponse({ message: serviceResult.message })
      );
   } catch (error) {
      next(error);
   }
};

// --- session ---

/**
 * @description Get all sessions for the current user
 * Extracts userId and schema, then calls authService.getSessions
 */
const getSessions = async (req, res, next) => {
   try {
      const userId = sessionUtils.getUserId(req.session);
      const schema = sessionUtils.getSchema(req.session);

      const serviceResult = await authService.getSessions({ userId, schema });
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * @description Get a specific session by ID
 * Extracts session data and calls authService.getSession
 */
const getSession = async (req, res, next) => {
   try {
      const userId = sessionUtils.getUserId(req.session);
      const sessionData = req.session; // The service method expects the whole session object

      // authService.getSession is expected to return { message: string, data: object }
      const serviceResult = await authService.getSession({
         userId,
         sessionData,
      });
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

// ---- getCurrentUser ---
/**
 * @description Get current user details
 * Extracts userId and schema, then calls authService.getCurrentUser
 */
const getCurrentUser = async (req, res, next) => {
   try {
      const userId = sessionUtils.getUserId(req.session);
      const schema = sessionUtils.getSchema(req.session);
      const role = sessionUtils.getRole(req.session);
      const poolMetadata = sessionUtils.getPoolMetadata(req.session);

      const serviceResult = await authService.getCurrentUser({
         userId,
         schema,
         sessionRole: role,
         poolMetadata,
      });
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

// --- export ---
export { register, login, logout, getCurrentUser, getSessions, getSession };
