console.log(
   "[AUTH_SERVICE_JS_LOAD_CONFIRM_V7.DEBUG] File loaded at: " +
      new Date().toISOString()
); // UNIQUE TOP-LEVEL LOG

import {
   AuthError,
   ConflictError,
   NotFoundError,
   ValidationError,
} from "../utils/customErrors.js";
import clientServerService from "./clientServer.js";
import userService from "./user.js";
import sessionService from "./session.js";
import { prepareInstance } from "../models/functional/index.js";
import { User, ClientServer, Session } from "../models/index.js";
import sessionUtils from "../utils/request/session.js";

/** ------- auth service ------- */

/**
 * - login
 * - logout
 * - register
 * - getCurrentUser
 *
 * uses
 * - repository to interact with the database
 * - errorHandler to handle errors
 * - uuid to generate unique identifiers
 * - schema from session context
 */

// --- pure functions ---

/**
 * Service instances
 * - services/
 *   - user.js
 *   - clientServer.js
 *   - session.js
 */
const servicesMap = (modelClass) => {
   const map = {
      User: userService,
      ClientServer: clientServerService,
      Session: sessionService,
   };
   return map[modelClass];
};

/**
 * prep pipeline
 *
 * pipeline function
 * - three part flow:
 *   1. get instance
 *   2. get service
 *   3. return instance and service
 * @async
 * @param {*} model - model class
 * @param  {...any} args - arguments to pass on
 * @returns {Object} { instance, service }
 */
const prep = async (modelClass, ...args) => {
   const instance = await modelClass.fromRequestBody(...args);
   const service = servicesMap(modelClass.name);

   if (!service) {
      throw new AuthError("Service not found");
   }

   return {
      instance,
      service,
   };
};

/**
 * execute pipeline
 *
 * pipeline function
 * 1. prep
 * 2. execute
 * 3. return
 * @async
 * @param {*} modelClass - model class
 * @param {*} operation - operation to execute
 * @param {*} requiredFields - required fields for service operation
 * @param {*} (opt null) messageParam - message to return
 * @param  {...any} args - arguments to pass on
 * @returns {Object} { success, data, message }
 */

const execute = async (
   modelClass,
   operation,
   requiredFields,
   messageParam = null,
   ...args
) => {
   // prep
   const { instance, service } = await prep(modelClass, ...args);
   if (!instance) {
      return null;
   }

   const params = prepareInstance(instance, requiredFields);
   const serviceMethod = service[operation];

   // execute
   const { success, data, error, message } = await serviceMethod(params);

   // return
   if (success) {
      return { success, data, message: messageParam ? messageParam : message };
   }
   throw new AuthError(error);
};

// --- service functions ---

/**
 * Login a user and create a session
 * @param {Object} params - Parameters object
 * @param {Object} params.credentials - User credentials (email, password)
 * @param {string} params.schema - Database schema
 * @param {Optional string} params.ipAddress - Client IP address
 * @param {Optional string} params.userAgent - Client user agent
 * @returns {Object} {
 *    message: string,
 *    data: {
 *       ...userResponseData,
 *       schema: schema,
 *    }
 * }
 */
export async function login({
   credentials,
   schema,
   req,
   ipAddress = null,
   userAgent = null,
}) {
   // Directly call userService.get for user retrieval and password validation
   const userResult = await userService.get({
      email: credentials.email,
      password: credentials.password, // userService.get handles password verification
      schema: schema,
      returnPwd: false, // We don't need the hash in the authService response data for the user
   });

   check(
      userResult?.success && userResult?.data,
      userResult?.message ||
         "Login failed: User not found or credentials incorrect."
   );
   const user = userResult.data; // This is the user object if login was successful

   // Proceed to create a database session
   const sessionResult = await execute(
      Session,
      "create",
      ["userId", "schema", "ipAddress", "userAgent"], // Fields for Session.fromRequestBody
      null, // messageParam for execute
      { userId: user.id, schema, ipAddress, userAgent } // Data for Session.fromRequestBody
   );

   check(
      sessionResult?.success && sessionResult?.data,
      sessionResult?.message || "Session creation failed."
   );
   const dbSession = sessionResult.data;

   // Debug logging for session creation
   console.log(
      "[LOGIN DEBUG] dbSession object:",
      JSON.stringify(dbSession, null, 2)
   );
   console.log("[LOGIN DEBUG] dbSession.sessionId:", dbSession?.sessionId);
   console.log("[LOGIN DEBUG] dbSession.session_id:", dbSession?.session_id);
   console.log("[LOGIN DEBUG] dbSession.id:", dbSession?.id);

   // Get allowed URLs (if applicable for this user/schema)
   let allowedUrls = [];
   try {
      const allowedUrlsResult = await clientServerService.getAllowedUrls({
         userId: user.id,
         schema: schema,
      });
      allowedUrls = allowedUrlsResult?.data || [];
   } catch (error) {
      console.warn("Failed to get allowed URLs for user:", error.message);
      // Continue with empty allowed URLs array
   }

   // Use the camelCase sessionId from the Session model instance
   const sessionId = dbSession.sessionId;
   console.log("[LOGIN DEBUG] Final sessionId to use:", sessionId);

   sessionUtils.setObj(req, {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schema: schema,
      sessionId: sessionId,
      isAuthenticated: true,
      allowedUrls: allowedUrls,
   });

   // Force session save to ensure persistence
   await new Promise((resolve, reject) => {
      req.session.save((err) => {
         if (err) {
            console.error("[SESSION SAVE ERROR]", err);
            reject(err);
         } else {
            console.log("[SESSION SAVED] Session data persisted successfully");
            resolve();
         }
      });
   });

   // Create session data structure that frontend expects
   const sessionData = {
      isAuthenticated: true,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schema: schema,
      sessionId: sessionId,
      ownerId: allowedUrls.length > 0 ? user.id : null,
      allowedUrls: allowedUrls,
      expires_at: dbSession.expires_at,
   };

   return {
      success: true,
      data: {
         schema,
         user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
         },
         session: { id: dbSession.id, expires_at: dbSession.expires_at },
         allowedUrls: allowedUrls,
      },
      sessionUpdate: sessionData,
      message: "Login successful",
   };
}

/**
 * Logout a user and destroy their session
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} (opt) params.sessionId - Session ID from session
 * @param {string} params.schema - Database schema
 * @returns {Object} Logout response
 */
export async function logout({ userId, sessionId = null, schema }) {
   const { success, data, message } = await sessionService.deleteSession({
      userId,
      sessionId,
      schema,
   });
   check(success, message);
   return { success, data, message: "Logout successful" };
}

/**
 * Register a new user
 * @param {Object} params - Parameters object
 * @param {Object} params.userData - User data (name, email, password)
 * @param {string} params.schema - Database schema
 * @returns {Object} Registration success response
 *
 * @flow
 * 1. execute createUser
 * 2. execute getUser
 * 3. create session for new user
 * 4. update req.session
 * 5. return success message
 */
export async function register({ userData, schema, req }) {
   console.log("[AUTH_SERVICE_REGISTER] userData:", userData);
   console.log("[AUTH_SERVICE_REGISTER] schema:", schema);
   console.log("[AUTH_SERVICE_REGISTER] req:", req);

   // Step 1: Check if email already exists
   let userExists = false;
   try {
      const emailCheckResult = await userService.get({
         email: userData.email,
         schema: schema,
      });

      if (
         emailCheckResult &&
         emailCheckResult.success === true &&
         emailCheckResult.data != null
      ) {
         userExists = true;
      }
   } catch (error) {
      console.log(
         "[AUTH_SERVICE_REGISTER_CATCH] Caught error during email check:",
         JSON.stringify(
            {
               name: error.name,
               message: error.message,
               statusCode: error.statusCode,
               isNotFoundErrorInstance: error instanceof NotFoundError,
               constructorName: error.constructor?.name,
               errorObjectKeys: Object.keys(error),
            },
            null,
            2
         )
      );

      if (error instanceof NotFoundError || error.name === "NotFoundError") {
         // User not found by email, which is good for registration.
         userExists = false;
      } else {
         // Different error, re-throw it.
         console.error(
            "[AUTH_SERVICE_REGISTER_CATCH] Re-throwing unexpected error:",
            error
         );
         throw error;
      }
   }

   if (userExists) {
      throw new ConflictError(
         "Email already registered. Please login or use a different email."
      );
   }

   // Step 2: Create the user - call userService.createUser directly
   const userCreationResult = await userService.createUser(userData, schema);

   // Check for success from createUser
   if (
      !userCreationResult ||
      !userCreationResult.success ||
      !userCreationResult.data
   ) {
      // Use a more specific error message if available from userCreationResult
      throw new AuthError(
         userCreationResult?.message ||
            "User creation failed after email check."
      );
   }
   const createdUser = userCreationResult.data;

   // Step 3: Create a database session for the new user
   const sessionCreationResult = await sessionService.create({
      userId: createdUser.id,
      schema: schema,
   });

   if (
      !sessionCreationResult ||
      !sessionCreationResult.success ||
      !sessionCreationResult.data
   ) {
      // For now, assume this is critical.
      throw new AuthError(
         sessionCreationResult?.message ||
            "Session creation failed post-registration."
      );
   }
   const dbSession = sessionCreationResult.data;

   // Step 4: Update Express session object (req.session)
   sessionUtils.setObj(req, {
      userId: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      schema: schema,
      sessionId: dbSession.sessionId,
      isAuthenticated: true,
      allowedUrls: [],
   });

   // Force session save to ensure persistence
   await new Promise((resolve, reject) => {
      req.session.save((err) => {
         if (err) {
            console.error("[SESSION SAVE ERROR]", err);
            reject(err);
         } else {
            console.log("[SESSION SAVED] Session data persisted successfully");
            resolve();
         }
      });
   });

   // Create session data structure that frontend expects
   const sessionData = {
      isAuthenticated: true,
      userId: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      schema: schema,
      sessionId: dbSession.sessionId,
      ownerId: null, // New users don't own resources initially
      allowedUrls: [],
      expires_at: dbSession.expires_at,
   };

   return {
      success: true,
      data: {
         user: {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
         },
         session: { id: dbSession.id, expires_at: dbSession.expires_at },
      },
      sessionUpdate: sessionData, // Add the sessionUpdate field that frontend expects
      message: "User registered and logged in successfully",
   };
}

/**
 * Get all sessions for a user
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.schema - Database schema
 * @returns {Object} { success, data, message }
 */
export async function getSessions({ userId, schema }) {
   check(userId, "User ID is required for getting sessions");

   const { success, data, message } = await sessionService.getByUserId({
      userId,
      schema,
   });

   return { success, data, message };
}

/**
 * Get current user information
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.schema - Database schema
 * @returns {Object} { success, data, message }
 */
export async function getCurrentUser({ userId, schema = "client_app" }) {
   check(userId, "User ID is required for getting current user");

   const { success, data, message } = await userService.get({
      id: userId,
      schema,
   });

   return { success, data, message };
}

/**
 * Get session information
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {Object} params.sessionData - Session data object
 * @returns {Object} { success, data, message }
 */
export async function getSession({ userId, sessionData }) {
   check(userId, "User ID is required for getting session");

   // Return formatted session information
   return {
      success: true,
      data: {
         userId: userId,
         sessionId: sessionData.sessionId,
         schema: sessionData.schema,
         role: sessionData.role,
         isAuthenticated: sessionData.isAuthenticated,
         allowedUrls: sessionData.allowedUrls || [],
         expires_at: sessionData.expires_at,
      },
      message: "Session information retrieved successfully",
   };
}

/**
 * isOwner
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.schema - Database schema
 * @returns {Object} { success, data, message }
 */
export async function isOwner({ req }) {
   const ownerId = sessionUtils.getUserId(req.session);
   const schema = sessionUtils.getSchema(req.session);
   if (!ownerId || !schema) {
      return { success: false, message: "No owner ID or schema in session" };
   }
   const { success, data, message } = await userService.get({
      id: ownerId,
      schema,
   });
   return { success, data, message };
}

/**
 * Validates if a user from a given session schema has access to a target schema.
 * - Allows if user's session schema matches the target schema.
 * - Allows if user is 'owner' or 'admin' in 'auth_internal' schema, accessing any target schema.
 * - Denies in other cross-schema access attempts.
 * @param {string} userIdFromSession - The ID of the user from their current session.
 * @param {string} userSchemaFromSession - The schema context of the user's current session.
 * @param {string} targetSchemaFromRequest - The schema being targeted by the current request.
 * @throws {AuthError} If access is denied or user cannot be validated.
 */
export async function validateUserSchemaAccess(
   userIdFromSession,
   userSchemaFromSession,
   targetSchemaFromRequest
) {
   if (
      !userIdFromSession ||
      !userSchemaFromSession ||
      !targetSchemaFromRequest
   ) {
      console.warn(
         "[AUTH_VALIDATE_SCHEMA_ACCESS] Missing required parameters for validation."
      );
      throw new AuthError(
         "Cannot validate schema access: missing session or target schema information."
      );
   }

   if (userSchemaFromSession === targetSchemaFromRequest) {
      console.log(
         `[AUTH_VALIDATE_SCHEMA_ACCESS] Access granted: User operating within their own schema ('${userSchemaFromSession}').`
      );
      return true;
   }

   if (userSchemaFromSession === "auth_internal") {
      // For auth_internal users, check their role to determine cross-schema access
      const userResult = await userService.get({
         id: userIdFromSession,
         schema: userSchemaFromSession,
      });

      if (!userResult || !userResult.success || !userResult.data) {
         console.warn(
            `[AUTH_VALIDATE_SCHEMA_ACCESS] User (ID: ${userIdFromSession}) not found in schema '${userSchemaFromSession}'.`
         );
         throw new AuthError(
            "User session invalid or user not found, cannot validate schema access."
         );
      }
      const user = userResult.data;

      if (user.role === "owner" || user.role === "admin") {
         console.log(
            `[AUTH_VALIDATE_SCHEMA_ACCESS] Privileged user ${user.email} (role: ${user.role} in ${userSchemaFromSession}) accessing target schema '${targetSchemaFromRequest}'. Access granted.`
         );
         return true;
      }
   }

   // For all other cross-schema access attempts, check if the user exists in the target schema
   // This allows users who have accounts in multiple schemas to switch between them
   try {
      const targetSchemaUserResult = await userService.get({
         id: userIdFromSession,
         schema: targetSchemaFromRequest,
      });

      if (
         targetSchemaUserResult &&
         targetSchemaUserResult.success &&
         targetSchemaUserResult.data
      ) {
         console.log(
            `[AUTH_VALIDATE_SCHEMA_ACCESS] User ${userIdFromSession} has account in target schema '${targetSchemaFromRequest}'. Access granted.`
         );
         return true;
      }
   } catch (error) {
      // User doesn't exist in target schema, which is expected for most cross-schema attempts
      console.log(
         `[AUTH_VALIDATE_SCHEMA_ACCESS] User ${userIdFromSession} not found in target schema '${targetSchemaFromRequest}'.`
      );
   }

   console.warn(
      `[AUTH_VALIDATE_SCHEMA_ACCESS] Unauthorized cross-schema access attempt: User ${userIdFromSession} from '${userSchemaFromSession}' trying to access '${targetSchemaFromRequest}'.`
   );
   throw new AuthError(
      `User from schema '${userSchemaFromSession}' is not authorized to access data in schema '${targetSchemaFromRequest}'.`
   );
}

// --- helper functions ---

/**
 * Check if a user exists
 * @param {Object || Boolean} instance - Instance object
 * @param {string} message - Error message
 */
function check(instance, message) {
   if (!instance) {
      throw new AuthError(message);
   }
}

// --- export ---
const authService = {
   login,
   logout,
   register,
   getSessions,
   getCurrentUser,
   getSession,
   isOwner,
   validateUserSchemaAccess,
};

export default authService;
