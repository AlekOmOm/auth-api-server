import { AuthError, ValidationError } from "../middleware/errorHandler.js";
import clientServerService from "./clientServer.js";
import userService from "./user.js";
import sessionService from "./session.js";
import { prepareInstance } from "../models/functional/index.js";
import { User, ClientServer, Session } from "../models/index.js";

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
   ipAddress = null, // session.ipAddress (optional)
   userAgent = null, // session.userAgent (optional)
}) {
   let requiredFields = ["name", "email", "password", "schema"];
   const user = await execute(
      User,
      "get",
      requiredFields,
      null,
      credentials,
      schema
   );

   check(user, "User not found");

   requiredFields = ["userId", "schema"];
   const session = await execute(
      Session,
      "create",
      requiredFields,
      null,
      user.id,
      schema
   );

   check(session, "Session not created");

   requiredFields = ["userId"];
   const allowedUrls = await execute(
      ClientServer,
      "getAllowedUrls",
      requiredFields,
      null,
      user.id,
      schema
   );

   updateSession(session, {
      schema,
      user,
      allowedUrls,
   });

   return {
      success: true,
      data: {
         schema,
         user,
         session,
         allowedUrls,
      },
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
   const { success, data, message } = await execute(
      Session,
      "deleteSession",
      ["userId", "schema"],
      userId,
      sessionId,
      schema
   );
   check(success, message);
   return { success, data, message: "Logout successful" };
}

/**
 * Register a new user
 * @param {Object} params - Parameters object
 * @param {Object} params.credentials - User credentials (name, email, password)
 * @param {string} params.schema - Database schema
 * @returns {Object} Registration success response
 *
 * @flow
 * 1. execute createUser
 * 2. execute getUser
 * 3. return success message
 */
export async function register({ credentials, schema }) {
   let { success, data, message } = await execute(
      User,
      "createUser",
      ["name", "email", "password", "schema"],
      credentials,
      schema
   );
   check(success, message);
   const updatedResult = await execute(
      User,
      "getUser",
      ["userId", "schema"],
      data.id,
      schema
   );

   check(success, message);
   return {
      success: true,
      data: updatedResult.data,
      message: "User registered successfully",
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
   const { ownerId, schema } = requestUtils.session.getSession(req);
   const { success, data, message } = await execute(
      User,
      "getUser",
      ["userId", "schema"],
      ownerId,
      schema
   );
   return;
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
};

export default authService;
