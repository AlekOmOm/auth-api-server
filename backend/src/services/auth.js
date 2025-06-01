import { AuthError, ValidationError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import * as sessionUtils from "../utils/session.js";
import userService from "./user.js";
import {
   createSuccessResponse,
   removePasswordFromUser,
} from "../utils/authUtils.js";
import { userRepo as userAuthInternalRepo } from "../repo/repositories/userRepository.js";
import { userRepo as userClientAppRepo } from "../repo/repositories/clientAppRepository.js";
import { getAuthPool } from "../repo/connection/pools/auth.js";
import * as clientServerService from "./clientServer.js";

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

/**
 * Login a user and create a session
 * @param {Object} params - Parameters object
 * @param {Object} params.credentials - User credentials (email, password)
 * @param {string} params.refererUrl - Return URL after login
 * @param {string} params.schema - Database schema
 * @param {string} params.poolContext - Pool context from session
 * @param {Object} params.poolMetadata - Pool metadata from session
 * @param {Object} params.session - Current session object (for reading/updating)
 * @param {string} params.ipAddress - Client IP address
 * @param {string} params.userAgent - Client user agent
 * @returns {Object} Login response with user data and session updates
 */
export async function login({
   credentials,
   refererUrl,
   schema,
   poolContext,
   poolMetadata,
   session,
   ipAddress,
   userAgent,
}) {
   try {
      if (!credentials.email || !credentials.password) {
         throw new ValidationError("Email and password are required");
      }

      const authRepo =
         schema === "auth_internal" ? userAuthInternalRepo : userClientAppRepo;
      const userForPasswordCheck = await authRepo.getUserByEmail(
         schema,
         credentials.email
      );
      if (!userForPasswordCheck) {
         throw new AuthError("Invalid credentials");
      }
      if (userForPasswordCheck.password_hash !== credentials.password) {
         throw new AuthError("Invalid credentials");
      }

      const authenticatedUser = userForPasswordCheck;
      const sessionUpdate = {
         userId: authenticatedUser.id,
         role: authenticatedUser.role,
      };

      let effectiveRole = authenticatedUser.role;
      if (schema === "auth_internal" || poolContext === "auth_internal") {
         const authDbPool = await getAuthPool();
         const { rows: userClients } = await authDbPool.query(
            "SELECT COUNT(*) as client_count FROM client_servers WHERE owner_id = $1",
            [authenticatedUser.id]
         );
         if (userClients[0]?.client_count > 0) {
            effectiveRole = "owner";
            sessionUpdate.role = "owner";
            sessionUpdate.poolContext = "auth_internal";
            sessionUpdate.schema = "auth_internal";
            sessionUpdate.poolMetadata = {
               user_role: "owner",
               owned_clients: userClients[0].client_count,
               reason: "login_is_actual_owner",
               target_page: entryPointUrl,
            };
         } else {
            sessionUpdate.poolMetadata = {
               ...(poolMetadata || {}),
               user_role: authenticatedUser.role,
               reason: "login_auth_internal_user_not_yet_owner",
               target_page: entryPointUrl,
            };
         }
      } else {
         sessionUpdate.poolMetadata = {
            ...(poolMetadata || {}),
            user_role: authenticatedUser.role,
            target_page: entryPointUrl,
         };
      }

      const sessionRepo =
         schema === "auth_internal" ? userAuthInternalRepo : userClientAppRepo;
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      await sessionRepo.createSession(schema, [
         uuidv4(),
         authenticatedUser.id,
         sessionId,
         ipAddress || null,
         userAgent || null,
         expiresAt.toISOString(),
      ]);

      const userResponseData = removePasswordFromUser(authenticatedUser);
      const finalUserResponseData = {
         ...userResponseData,
         role: effectiveRole,
      };

      return {
         message: "Login successful",
         data: {
            ...finalUserResponseData,
            schema: schema,
            poolMetadata: sessionUpdate.poolMetadata || null,
         },
         sessionUpdate,
      };
   } catch (error) {
      console.error(
         "🔐 [AUTH SERVICE] ❌ Login failed:",
         error.message,
         error.stack
      );
      if (!(error instanceof AuthError || error instanceof ValidationError)) {
         throw new AuthError(
            error.message || "Login failed due to an unexpected error"
         );
      }
      throw error;
   }
}

/**
 * Logout a user and destroy their session
 * @param {Object} params - Parameters object
 * @param {string} params.userId - User ID from session
 * @param {string} params.schema - Database schema
 * @param {Function} params.destroySession - Function to destroy the session
 * @returns {Object} Logout response
 */
export async function logout({ userId, schema, destroySession }) {
   try {
      if (!userId) {
         throw new AuthError("No active session");
      }

      const repo =
         schema === "auth_internal" ? userAuthInternalRepo : userClientAppRepo;
      try {
         await repo.deleteSessionByUserId(schema, userId);
      } catch (dbError) {
         console.error(
            "🚪 [AUTH SERVICE] ❌ Database session deletion failed:",
            dbError.message
         );
      }
      try {
         await destroySession();
      } catch (err) {
         console.error("🚪 [AUTH SERVICE] Session destruction error:", err);
      }
      return { message: "Logout successful" };
   } catch (error) {
      console.error("🚪 [AUTH SERVICE] ❌ Logout error:", error);
      throw error;
   }
}

/**
 * Register a new user
 * @param {Object} params - Parameters object
 * @param {Object} params.userData - User registration data
 * @param {string} params.schema - Database schema from session
 * @param {string} params.poolContext - Pool context from session
 * @param {Object} params.poolMetadata - Pool metadata from session
 * @param {string} params.refererUrl - Referer URL from registration
 * @returns {Object} Registration success response
 */
export async function register({ userData, schema, refererUrl }) {
   try {
      const userType = userData.userType || "client";
      let targetSchema;
      if (userType === "auth") {
         targetSchema = "auth_internal";
      } else {
         if (refererUrl) {
            const clientServerLookup =
               await clientServerService.getClientServerByUrl(refererUrl);
            if (
               clientServerLookup &&
               clientServerLookup.success &&
               clientServerLookup.data &&
               clientServerLookup.data.schema_name
            ) {
               targetSchema = clientServerLookup.data.schema_name;
            } else {
               console.warn(
                  "Could not determine schema from refererUrl, falling back."
               );
            }
         }
         if (!targetSchema) {
            if (schema && schema !== "auth_internal") {
               targetSchema = schema;
            } else {
               targetSchema =
                  process.env.DEFAULT_CLIENT_SCHEMA ||
                  "client_tradingsimulator_1748187489195";
               console.log(
                  "Using fallback schema for client registration:",
                  targetSchema
               );
            }
         }
      }

      if (!userData.name || !userData.email || !userData.password) {
         throw new ValidationError("Name, email, and password are required");
      }
      const repo =
         targetSchema === "auth_internal"
            ? userAuthInternalRepo
            : userClientAppRepo;
      const existingUser = await repo.getUserByEmail(
         targetSchema,
         userData.email
      );
      if (existingUser) {
         throw new ValidationError("User with this email already exists");
      }
      let role = userType === "auth" ? "owner" : userData.role || "user";
      const result = await repo.createUser(targetSchema, [
         userData.name,
         role,
         userData.email,
         userData.password,
      ]);
      return {
         message: "Registration successful",
         data: {
            userId: result.lastID,
            userType: userType,
            schema: targetSchema,
            role: role,
         },
      };
   } catch (error) {
      console.log("📝 [AUTH SERVICE] ❌ Registration failed:", error.message);
      throw error;
   }
}

const authService = {
   login,
   logout,
   register,
};

export default authService;
