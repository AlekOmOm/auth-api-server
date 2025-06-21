// --- services ---
import * as authService from "../services/auth.js";
import * as userService from "../services/user.js";
import * as sessionService from "../services/session.js";
import * as clientServerService from "../services/clientServer.js";
import config from "../config/env.js"; // Added to access SCHEMAS constants

// --- utils ---
import * as sessionUtils from "../utils/request/session.js";
import { standardizeResponse } from "../utils/responseUtils.js";
import { ValidationError, AuthError } from "../utils/customErrors.js"; // Import custom error classes
import asyncErrorHandler from "../utils/asyncErrorHandler.js"; // Import the async handler
import {
   validateUserForContext,
   getRequiredFieldsForSchema,
} from "../utils/validationSchemas.js"; // Import context-aware validator and new utility

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
const registerController = async (req, res, next) => {
   const { userType, ...actualUserData } = req.body; // Separate userType from the rest of user data
   let schema;

   if (userType === "auth") {
      schema = config.SCHEMAS.AUTH_NAME;
      console.log(
         `[REGISTER_CTRL] userType is 'auth', setting schema to: ${schema}`
      );
   } else if (userType === "client") {
      schema = req.schema; // This should be set by detectSchema middleware from Referer
      console.log(
         `[REGISTER_CTRL] userType is 'client', using schema from middleware (Referer): ${schema}`
      );
      if (!schema) {
         // If userType is 'client' but middleware didn't find a schema from Referer
         console.error(
            "[REGISTER_CTRL] userType is 'client' but req.schema is undefined. This indicates an issue with Referer-based detection."
         );
         throw new ValidationError(
            "Schema for 'client' user type could not be determined from Referer. Ensure a valid 'Referer' header was present."
         );
      }
   } else {
      schema = req.schema || req.body.schema;
      req.body.userType = "owner";
      console.log(
         `[REGISTER_CTRL] userType is '${userType}' (unexpected or missing). Falling back to req.schema ('${req.schema}') or req.body.schema ('${req.body.schema}'). Resulting schema: ${schema}`
      );
      // If schema resolves to auth_internal for an ambiguous userType, ensure role is 'owner'
      if (schema === config.SCHEMAS.AUTH_NAME) {
         if (
            !actualUserData.role ||
            !["owner", "admin"].includes(actualUserData.role)
         ) {
            actualUserData.role = "owner";
            console.log(
               `[REGISTER_CTRL] Original userType ambiguous and schema is '${config.SCHEMAS.AUTH_NAME}'. Set actualUserData.role to 'owner'.`
            );
         }
      }
   }

   if (!schema) {
      console.error(
         `[REGISTER_CTRL] Schema could not be determined. userType: '${userType}', req.schema: '${req.schema}', req.body.schema: '${req.body.schema}'.`
      );
      throw new ValidationError(
         "Schema could not be determined for the registration request. Please specify userType ('auth' for system owners/admins, 'client' for regular users) or ensure a valid Referer header is present."
      );
   }

   const validatedUserData = validateUserForContext(schema, actualUserData);

   const serviceResult = await authService.register({
      userData: validatedUserData,
      schema,
      req,
   });

   res.status(201).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
         sessionUpdate: serviceResult.sessionUpdate,
      })
   );
};

/**
 * @description logic for logging in
 * Extracts credentials and session data, then calls authService.login
 */
const loginController = async (req, res, next) => {
   const { credentials } = req.body;
   let schema = req.body.schema || req.schema;
   const ipAddress = req.ip;
   const userAgent = req.headers["user-agent"];

   if (!schema) {
      schema = config.SCHEMAS.AUTH_NAME;
   }

   if (!schema) {
      throw new ValidationError(
         "Schema could not be determined for the request, and default schema is invalid or not configured."
      );
   }

   if (!credentials || !credentials.email || !credentials.password) {
      throw new ValidationError(
         "Email and password are required in credentials.",
         [
            !credentials?.email && {
               field: "email",
               message: "Email is required",
            },
            !credentials?.password && {
               field: "password",
               message: "Password is required",
            },
         ].filter(Boolean)
      );
   }

   const { success, data, message, sessionUpdate } = await authService.login({
      credentials,
      schema,
      req,
      ipAddress,
      userAgent,
   });

   if (!success) {
      throw new AuthError(
         message || "Login failed due to invalid credentials or other issue."
      );
   }
   res.status(200).json(
      standardizeResponse({
         data,
         message,
         sessionUpdate,
      })
   );
};

/**
 * @description logic for logging out
 * Extracts session data and calls authService.logout
 */
const logoutController = async (req, res, next) => {
   const userId = sessionUtils.getUserId(req.session);
   const sessionId = sessionUtils.getSessionId(req.session);
   const schema = sessionUtils.getSchema(req.session);

   const serviceResult = await authService.logout({
      userId,
      sessionId,
      schema,
   });
   if (serviceResult.success) {
      req.session.destroy();
   }
   res.status(200).json(
      standardizeResponse({ message: serviceResult.message })
   );
};

// --- session ---

/**
 * @description Get all sessions for the current user
 * Extracts userId and schema, then calls authService.getSessions
 */
const getSessionsController = async (req, res, next) => {
   const userId = sessionUtils.getUserId(req.session);
   const schema = sessionUtils.getSchema(req.session);

   const serviceResult = await sessionService.getAll({ userId, schema });
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * @description Get a specific session by ID
 * Extracts session data and calls authService.getSession
 */
const getSessionController = async (req, res, next) => {
   console.log(
      "[GET SESSION DEBUG] Full req.session:",
      JSON.stringify(req.session, null, 2)
   );

   const userId = sessionUtils.getUserId(req.session);
   const sessionId = sessionUtils.getSessionId(req.session);
   const schema = sessionUtils.getSchema(req.session);

   const sessionData = {
      isAuthenticated: req.session.isAuthenticated,
      user: {
         id: userId,
         name: req.session.name,
         email: req.session.email,
         role: req.session.role,
      },
      schema: schema,
      sessionId: sessionId,
      allowedUrls: req.session.allowedUrls || [],
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
   };

   // Add validation_context if schema is available
   if (sessionData.schema) {
      sessionData.validation_context = {
         schema: sessionData.schema,
         required_fields: getRequiredFieldsForSchema(sessionData.schema),
      };
   }

   res.status(200).json(
      standardizeResponse({
         data: sessionData,
         message: "Session retrieved successfully",
      })
   );
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
const getCurrentUserController = async (req, res, next) => {
   const userId = sessionUtils.getUserId(req.session);
   const name = sessionUtils.getUserName(req.session);
   const email = sessionUtils.getUserEmail(req.session);
   const schema = sessionUtils.getSchema(req.session);

   const { data: user, message: userServiceMessage } = await userService.get({
      userId,
      name,
      email,
      schema,
      withPassword: true,
   });

   const clientServerInfo = await clientServerService.get({
      userId: user.id,
      schema,
   });

   const data = {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      password: user.password,
      schema,
      urls: [
         clientServerInfo?.identifierUrl,
         clientServerInfo?.entryPointUrl,
         ...(clientServerInfo?.authorizedUrls || []),
      ].filter(Boolean),
   };

   res.status(200).json(
      standardizeResponse({
         data,
         message: userServiceMessage,
      })
   );
};

// --- export wrapped controllers ---
export const register = asyncErrorHandler(registerController);
export const login = asyncErrorHandler(loginController);
export const logout = asyncErrorHandler(logoutController);
export const getCurrentUser = asyncErrorHandler(getCurrentUserController);
export const getSessions = asyncErrorHandler(getSessionsController);
export const getSession = asyncErrorHandler(getSessionController);
