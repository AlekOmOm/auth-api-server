import { AuthError, ValidationError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import * as sessionUtils from "../utils/session.js";
import userService from "./userService.js";

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
 * - schema from request context (session or API token)
 */

/**
 * structure for login/register/logout
 *
 * @param {Object} req
 * - req.body: {
 *    credentials: { email, password },
 *    url: "https://client.com/dashboard"
 * }
 * - req.session: {
 *    poolContext: "client_tenant",
 *    schema: "client_schema_name",
 *    poolMetadata: { client_id, user_role: "user", ... }
 * }
 * @returns {Object} return
 * - sucess response (createSuccessResponse)
 *   - res {
 *     message: ...,
 *     data: {
 *       userId: ...,
 *       role: ...,
 *       email: ...,
 *       name: ...,
 *     }
 *   }
 * - error response (throw error)
 */

/**
 * Login a user and create a session
 */
export async function login(req) {
   try {
      const { credentials } = req.body;
      const schema = req.session.schema; // Schema from session (set by detectSchema middleware)

      if (!credentials.email || !credentials.password) {
         throw new ValidationError("Email and password are required");
      }

      // Determine the correct repository for user authentication based on schema
      const authRepo =
         schema === "auth_internal" ? userAuthInternalRepo : userClientAppRepo;

      // Fetch user with password hash for verification from the correct repository
      const userForPasswordCheck = await authRepo.getUserByEmail(
         schema,
         credentials.email
      );

      if (!userForPasswordCheck) {
         console.log(
            `🔐 [AUTH SERVICE] ❌ User not found for email: ${credentials.email} in schema: ${schema}`
         );
         throw new AuthError("Invalid credentials");
      }

      // Verify password (actual hash comparison should be done securely)
      if (userForPasswordCheck.password_hash !== credentials.password) {
         console.log(
            `🔐 [AUTH SERVICE] ❌ Password mismatch for user: ${userForPasswordCheck.email}`
         );
         throw new AuthError("Invalid credentials");
      }

      // --- At this point, credentials are valid ---
      const authenticatedUser = userForPasswordCheck; // Use the full user object

      // Set essential session data
      req.session.userId = authenticatedUser.id;
      req.session.role = authenticatedUser.role;
      // req.session.schema is already set by detectSchema middleware

      // ---- BEGIN ADDED OWNER CHECK (Specific to auth_internal context potentially) ----
      let effectiveRole = authenticatedUser.role;
      if (
         schema === "auth_internal" ||
         req.session.poolContext === "auth_internal"
      ) {
         const authDbPool = await getAuthPool(); // auth_internal pool for client_servers table
         const { rows: userClients } = await authDbPool.query(
            "SELECT COUNT(*) as client_count FROM client_servers WHERE user_id = $1",
            [authenticatedUser.id]
         );
         if (userClients[0]?.client_count > 0) {
            effectiveRole = "owner";
            req.session.role = "owner"; // Update session role
            // Ensure poolContext and schema in session are also auth_internal if user is owner
            req.session.poolContext = "auth_internal";
            req.session.schema = "auth_internal";
            req.session.poolMetadata = {
               user_role: "owner",
               owned_clients: userClients[0].client_count,
               reason: "login_is_actual_owner",
               target_page: req.body?.returnUrl,
            };
         } else {
            // User is in auth_internal (or context became so), but not an owner of any clients
            req.session.poolMetadata = {
               ...(req.session.poolMetadata || {}),
               user_role: authenticatedUser.role, // Reflects actual DB role (e.g., 'user' in auth_internal)
               reason: "login_auth_internal_user_not_yet_owner",
               target_page: req.body?.returnUrl,
            };
         }
      } else {
         // For non-auth_internal schemas, set default poolMetadata if any specific logic is needed
         // Or ensure req.session.poolMetadata is appropriately handled by detectSchema
         req.session.poolMetadata = {
            ...(req.session.poolMetadata || {}),
            user_role: authenticatedUser.role,
            target_page: req.body?.returnUrl,
         };
      }
      // ---- END OWNER CHECK ----

      // Session creation in the correct database/schema
      const sessionRepo =
         req.session.schema === "auth_internal"
            ? userAuthInternalRepo
            : userClientAppRepo;
      const sessionId = uuidv4();
      // Assuming createSession method exists on both repos with compatible signature
      await sessionRepo.createSession(req.session.schema, [
         authenticatedUser.id,
         sessionId,
      ]);

      // Prepare user data for the response (password already stripped by this utility)
      const userResponseData = removePasswordFromUser(authenticatedUser);

      const finalUserResponseData = {
         ...userResponseData, // Contains id, name, email, role (without password_hash)
         role: effectiveRole, // Ensure the effectiveRole (potentially 'owner') is in the response
      };

      const response = {
         message: "Login successful",
         success: true,
         data: {
            ...finalUserResponseData,
            // Include schema and poolMetadata from the session for the client
            schema: req.session.schema,
            poolMetadata: req.session.poolMetadata || null,
         },
      };

      console.log("🔐 [AUTH SERVICE] ✅ Login successful for user:", {
         userId: authenticatedUser.id,
         email: authenticatedUser.email,
         schema: req.session.schema,
         role: effectiveRole, // Log effective role
         poolMetadata: req.session.poolMetadata,
      });

      return response;
   } catch (error) {
      console.error(
         "🔐 [AUTH SERVICE] ❌ Login failed:",
         error.message,
         error.stack
      );
      // Make sure the error object conforms to expected structure if it's a custom error
      // Or rethrow a new error with success: false if necessary.
      if (!(error instanceof AuthError || error instanceof ValidationError)) {
         // For unexpected errors, wrap them or ensure they have a 'success' flag
         throw new AuthError(
            error.message || "Login failed due to an unexpected error",
            false
         );
      }
      throw error; // Rethrow AuthError or ValidationError which should have success: false
   }
}

/**
 * Logout a user and destroy their session
 *
 * @returns {Object} return
 * - sucess response
 *   - req.session.destroy()
 *   - req.message = "Logout successful"
 * - error response (throw error)
 */
export async function logout(req) {
   try {
      if (!req.session || !req.session.userId) {
         throw new AuthError("No active session");
      }

      const session = sessionUtils.getSession(req.session);

      try {
         console.log(
            "🚪 [AUTH SERVICE] Deleting session from schema:",
            logoutSchema
         );
         await repo.deleteSessionByUserId(logoutSchema, req.session.userId);
         console.log("🚪 [AUTH SERVICE] ✅ Session deleted successfully");
      } catch (dbError) {
         console.error(
            "🚪 [AUTH SERVICE] ❌ Database session deletion failed:",
            dbError.message
         );
         // Don't fail the entire logout - session will expire naturally
         // But log the error for debugging
         console.log(
            "🚪 [AUTH SERVICE] Continuing with session destruction despite DB error"
         );
      }

      // Always destroy the session object regardless of DB deletion success
      const userId = req.session.userId; // Save for logging
      req.session.destroy((err) => {
         if (err) {
            console.error("🚪 [AUTH SERVICE] Session destruction error:", err);
         } else {
            console.log(
               "🚪 [AUTH SERVICE] ✅ Session destroyed for user:",
               userId
            );
         }
      });

      return createSuccessResponse("Logout successful");
   } catch (error) {
      console.error("🚪 [AUTH SERVICE] ❌ Logout error:", error);
      throw error;
   }
}

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @returns {Object} Registration success response
 */
export async function register(req) {
   try {
      console.log("📝 [AUTH SERVICE] Starting registration process");
      console.log("📝 [AUTH SERVICE] Request session data:", {
         poolContext: req.session?.poolContext,
         schema: req.session?.schema,
         poolMetadata: req.session?.poolMetadata,
      });

      const userData = req.body;

      // 🎯 NEW: Handle userType to determine correct schema
      const userType = userData.userType || "client"; // Default to client if not specified
      console.log("📝 [AUTH SERVICE] User type specified:", userType);

      let targetSchema;

      if (userType === "auth") {
         // Auth-system owner user - always goes to auth_internal
         targetSchema = "auth_internal";
         console.log(
            "📝 [AUTH SERVICE] Auth-system owner registration - using auth_internal schema"
         );
      } else {
         // Client app user - NEVER use auth_internal, even if session says so
         // Use Trading Simulator schema or fallback to client_template
         if (req.session?.schema && req.session.schema !== "auth_internal") {
            // Use detected client schema (from return_url detection)
            targetSchema = req.session.schema;
            console.log(
               "📝 [AUTH SERVICE] Client app user registration - using detected client schema:",
               targetSchema
            );
         } else {
            // Fallback to Trading Simulator schema or client_template
            targetSchema = "client_tradingsimulator_1748187489195"; // Use known Trading Simulator schema
            console.log(
               "📝 [AUTH SERVICE] Client app user registration - using Trading Simulator schema:",
               targetSchema
            );
         }
      }

      console.log("📝 [AUTH SERVICE] Registration attempt details:", {
         targetSchema: targetSchema,
         userType: userType,
         email: userData.email,
         name: userData.name,
         sessionContext: req.session?.poolContext,
         poolMetadata: req.session?.poolMetadata,
      });

      if (!userData.name || !userData.email || !userData.password) {
         console.log("📝 [AUTH SERVICE] ❌ Missing required fields");
         throw new ValidationError("Name, email, and password are required");
      }

      // Check if user already exists in target schema
      console.log(
         "📝 [AUTH SERVICE] Checking if user exists in schema:",
         targetSchema
      );
      const existingUser = await repo.getUserByEmail(
         targetSchema,
         userData.email
      );

      if (existingUser) {
         console.log(
            "📝 [AUTH SERVICE] ❌ User already exists in schema:",
            targetSchema,
            "email:",
            userData.email
         );
         throw new ValidationError("User with this email already exists");
      }

      console.log(
         "📝 [AUTH SERVICE] ✅ User does not exist, proceeding with creation"
      );

      // Determine role based on userType
      let role;
      if (userType === "auth") {
         // Auth-system users become owners
         role = "owner";
         console.log(
            "📝 [AUTH SERVICE] Setting role to 'owner' for auth-system user"
         );
      } else {
         // Client app users get default 'user' role
         role = userData.role || "user";
         console.log(
            "📝 [AUTH SERVICE] Setting role to 'user' for client app user"
         );
      }

      console.log(
         "📝 [AUTH SERVICE] Creating user in schema:",
         targetSchema,
         "with role:",
         role
      );

      const result = await repo.createUser(targetSchema, [
         userData.name,
         role,
         userData.email,
         userData.password, // In a real app, hash the password
      ]);

      console.log("📝 [AUTH SERVICE] ✅ User created successfully:", {
         userId: result.lastID,
         email: userData.email,
         name: userData.name,
         role: role,
         schema: targetSchema,
         userType: userType,
      });

      return createSuccessResponse("Registration successful", {
         userId: result.lastID,
         userType: userType,
         schema: targetSchema,
         role: role,
      });
   } catch (error) {
      console.log("📝 [AUTH SERVICE] ❌ Registration failed:", error.message);
      throw error;
   }
}

// --- session ---

/**
 * Get all sessions for the current user
 * @param {Object} session - Express session object
 * @param {string} schema - Database schema (retrieved from session/request context)
 * @returns {Object} All sessions
 */
export async function getSessions(session, schema) {
   try {
      if (!session || !session.userId) {
         throw new AuthError("Authentication required");
      }
      const sessions = await repo.getSessions(schema, session.userId);
      return createSuccessResponse("Sessions retrieved successfully", sessions);
   } catch (error) {
      throw error;
   }
}

/**
 * Get a specific session by ID
 * @param {Object} session - Express session object
 * @param {string} sessionId - Session ID
 * @param {string} schema - Database schema (retrieved from session/request context)
 * @returns {Object} {
 *    userId: string,
 *    sessionId: string,
 */
export async function getSession() {
   try {
      const data = {
         userId: sessionUtils.getUserId(req.session),
         session: sessionUtils.getSession(req.session),
      };

      return {
         message: "Session retrieved successfully",
         data: data,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Get current user information
 * @param {Object} req - Express request object
 * @returns {Object} User information with session-based role and metadata
 */
export async function getCurrentUser(req) {
   try {
      if (!req.session || !req.session.userId) {
         throw new AuthError("Authentication required");
      }

      const schema =
         req.session?.schema || process.env.SEED_SCHEMA || "client_template";
      const user = await repo.getUser(schema, req.session.userId);

      if (!user) {
         throw new AuthError("User not found");
      }

      // Use session-based role and metadata instead of raw DB data
      const sessionUser = removePasswordFromUser(user);

      // Override with session-based role if available (important for owner detection)
      if (req.session.role) {
         sessionUser.role = req.session.role;
      }

      // Include session metadata if available (needed for frontend role checking)
      if (req.session.poolMetadata) {
         sessionUser.poolMetadata = req.session.poolMetadata;
      }

      return {
         message: "User retrieved successfully",
         data: sessionUser,
      };
   } catch (error) {
      throw error;
   }
}

export default authService;
