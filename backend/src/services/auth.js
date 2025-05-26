import { AuthError, ValidationError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import repo from "../repo/userRepository.js"; // Import the repository
import getAuthPool from "../repo/connection/pools/auth.js"; // Added for owner check

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
 *    returnUrl: "https://client.com/dashboard"
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
      console.log("🔐 [AUTH SERVICE] Starting login process");
      console.log("🔐 [AUTH SERVICE] Request session data:", {
         poolContext: req.session?.poolContext,
         schema: req.session?.schema,
         poolMetadata: req.session?.poolMetadata,
      });

      const { credentials } = req.body;
      const schema =
         req.session?.schema || process.env.SEED_SCHEMA || "client_template";

      console.log("🔐 [AUTH SERVICE] Login attempt details:", {
         schema: schema,
         email: credentials.email,
         sessionContext: req.session?.poolContext,
         poolMetadata: req.session?.poolMetadata,
      });

      if (!credentials.email || !credentials.password) {
         console.log("🔐 [AUTH SERVICE] ❌ Missing credentials");
         throw new ValidationError("Email and password are required");
      }

      console.log("🔐 [AUTH SERVICE] Looking up user in schema:", schema);
      const user = await repo.getUserByEmail(schema, credentials.email);

      if (!user) {
         console.log("🔐 [AUTH SERVICE] ❌ User not found in schema:", schema);
         throw new AuthError("Invalid credentials");
      }

      console.log("🔐 [AUTH SERVICE] ✅ User found:", {
         userId: user.id,
         email: user.email,
         name: user.name,
         role: user.role,
         schema: schema,
      });

      // Verify password (using hash comparison in a real implementation)
      if (user.password_hash !== credentials.password) {
         console.log(
            "🔐 [AUTH SERVICE] ❌ Password mismatch for user:",
            user.email
         );
         throw new AuthError("Invalid credentials");
      }

      console.log(
         "🔐 [AUTH SERVICE] ✅ Password verified for user:",
         user.email
      );

      // Set session data
      req.session.userId = user.id;
      req.session.role = user.role;
      // Schema is already in session from middleware

      // ---- BEGIN ADDED OWNER CHECK ----
      // Check if the now authenticated user is an owner and update session + response role
      let effectiveRole = user.role; // Start with role from DB
      const authDbPool = await getAuthPool(); // Correctly await the pool promise
      const { rows: userClients } = await authDbPool.query(
         // Now call query on the resolved pool object
         "SELECT COUNT(*) as client_count FROM client_servers WHERE user_id = $1",
         [user.id]
      );

      if (userClients[0]?.client_count > 0) {
         effectiveRole = "owner"; // Upgrade to owner
         req.session.role = "owner"; // Update session role immediately
         req.session.poolContext = "auth_internal"; // Ensure auth_internal context
         req.session.schema = "auth_internal"; // Ensure auth_internal schema
         req.session.poolMetadata = {
            user_role: "owner",
            owned_clients: userClients[0].client_count,
            reason: "login_is_actual_owner",
            target_page: req.body?.returnUrl, // Persist original target
         };
         console.log(
            "🔐 [AUTH SERVICE] User is an OWNER. Session updated.",
            req.session.poolMetadata
         );
      } else {
         // User is in auth_internal (due to /owner target) but NOT an owner of any clients yet.
         // Keep role as 'user' from DB. Context remains 'auth_internal'.
         // poolMetadata should reflect they are a 'user' in this 'auth_internal' context for this request.
         effectiveRole = user.role; // Should be 'user' from DB
         req.session.role = user.role; // Keep DB role in session.role
         // req.session.poolContext and req.session.schema are already 'auth_internal' from detectSchema
         // Update poolMetadata to reflect true status for this login context
         req.session.poolMetadata = {
            user_role: user.role, // This will be 'user'
            reason: "login_auth_internal_user_not_yet_owner",
            target_page: req.body?.returnUrl, // Persist original target
            // Keep any other relevant info from detectSchema if needed, e.g., from internal_auth_system_page_target_override_default
            ...(req.session.poolMetadata || {}), // Merge cautiously
            user_role: user.role, // Ensure user_role is set to actual role from DB
            reason: "login_auth_internal_user_not_yet_owner", // Overwrite reason for clarity
         };
         console.log(
            "🔐 [AUTH SERVICE] User in auth_internal is NOT an OWNER. Session reflects 'user' role.",
            req.session.poolMetadata
         );
      }
      // ---- END ADDED OWNER CHECK ----

      console.log("🔐 [AUTH SERVICE] Setting session data:", {
         userId: user.id,
         role: req.session.role, // Use the potentially updated session role
         schema: req.session.schema,
      });

      // session creation
      const sessionId = uuidv4();
      console.log(
         "🔐 [AUTH SERVICE] Creating session in schema:",
         schema,
         "sessionId:",
         sessionId
      );
      await repo.createSession(schema, [user.id, sessionId]);

      const userResponseData = removePasswordFromUser(user);
      // We need to ensure the response reflects the effectiveRole
      const finalUserResponseData = {
         ...userResponseData,
         role: effectiveRole, // Override with effective role for the response
         // ensure id is present if removePasswordFromUser strips it and it was originally user.id
         id: user.id,
      };

      const response = createSuccessResponse("Login successful", {
         ...finalUserResponseData, // Use the user data with the correct role
         poolMetadata: req.session.poolMetadata || null,
      });

      console.log("🔐 [AUTH SERVICE] ✅ Login successful for user:", {
         userId: user.id,
         email: user.email,
         schema: schema,
         poolMetadata: req.session.poolMetadata,
      });

      return response;
   } catch (error) {
      console.log("🔐 [AUTH SERVICE] ❌ Login failed:", error.message);
      throw error;
   }
}

/**
 * Logout a user and destroy their session
 *
 * @returns {Object} return
 * - sucess response
 *   - req.session.destroy()
 *   - createSuccessResponse("Logout successful")
 * - error response (throw error)
 */
export async function logout(req) {
   try {
      if (!req.session || !req.session.userId) {
         throw new AuthError("No active session");
      }

      console.log("🚪 [AUTH SERVICE] Starting logout for user:", {
         userId: req.session.userId,
         schema: req.session?.schema,
         poolContext: req.session?.poolContext,
      });

      // Try to delete session from database
      // Use session schema if available, otherwise fall back to request schema
      const logoutSchema =
         req.session?.schema || req.schema || "client_template";

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
 * @returns {Object} Session information
 */
export async function getSession(session, sessionId, schema) {
   try {
      if (!session || !session.userId) {
         throw new AuthError("Authentication required");
      }
      const sessionData = await repo.getSession(schema, sessionId);
      return createSuccessResponse(
         "Session retrieved successfully",
         sessionData
      );
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

      return createSuccessResponse("User retrieved successfully", sessionUser);
   } catch (error) {
      throw error;
   }
}

// ---- helper functions ----

// Helper function to create standardized success responses
function createSuccessResponse(message, data = null) {
   const response = { message };
   if (data) {
      response.data = data;
   }
   /**
    * returns:
    * {
    *    message: ...,
    *    data: ...,
    * }
    */
   return response;
}

// Helper function to remove password from user object
function removePasswordFromUser(user) {
   if (user && typeof user === "object" && user !== null) {
      const { password, password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
   }
   /**
    * returns:
    * {
    *    userId: ...,
    *    role: ...,
    *    email: ...,
    *    name: ...,
    *    allowedUrls: [...],
    * }
    */
   return user;
}
