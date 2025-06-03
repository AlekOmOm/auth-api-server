// --- services ---
import * as authService from "../services/auth.js";
import * as userService from "../services/user.js";
import * as sessionService from "../services/session.js";

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
      const { credentials } = req.body;
      const schema = sessionUtils.getSchema(req.session);

      // check required fields
      if (!schema) {
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

      // login
      const { success, data, message } = await authService.login({
         credentials,
         schema,
      });

      // return
      if (!success) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error(message),
               statusCode: 400,
            })
         );
      }
      res.status(200).json(
         standardizeResponse({
            data,
            message,
         })
      );
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

      const serviceResult = await authService.logout({
         userId,
         schema,
      });
      if (serviceResult.success) {
         req.session.destroy();
      }
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

      const serviceResult = await sessionService.getAll({ userId, schema });
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
      const sessionData = req.session;

      const serviceResult = await sessionService.get({
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
 * Extracts user details and schema, then calls userService.getUser
 *
 * @context very protected route /me (ONLY for current user, not even admins)
 * - returns password
 *
 * @returns {Object} {
 *    id: string,
 *    name: string,
 *    role: string,
 *    email: string,
 *    password: string, // unhashed
 *    schema: string,
 *    urls: string[]
 */
const getCurrentUser = async (req, res, next) => {
   try {
      const userId = sessionUtils.getUserId(req.session);
      const name = sessionUtils.getUserName(req.session);
      const email = sessionUtils.getUserEmail(req.session);

      const schema = sessionUtils.getSchema(req.session);
      const { data: user, message } = await userService.get({
         userId,
         name,
         email,
         schema,
         withPassword: true,
      });
      const { identifierUrl, entryPointUrl, authorizedUrls } =
         await clientServerService.get({ userId: user.id, schema });

      const data = {
         id: user.id,
         name: user.name,
         role: user.role,
         email: user.email,
         password: user.password,
         schema,
         urls: [identifierUrl, entryPointUrl, ...authorizedUrls],
      };

      res.status(200).json(
         standardizeResponse({
            data,
            message,
         })
      );
   } catch (error) {
      next(error);
   }
};

// --- export ---
export { register, login, logout, getCurrentUser, getSessions, getSession };
