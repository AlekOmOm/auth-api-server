import { AuthError, ValidationError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import repo from "../repo/userRepository.js"; // Import the repository

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

      console.log("🔐 [AUTH SERVICE] Setting session data:", {
         userId: user.id,
         role: user.role,
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
      const response = createSuccessResponse("Login successful", {
         ...userResponseData,
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

      // Delete session from database
      await repo.deleteSessionByUserId(req.schema, req.session.userId);

      // Destroy session
      req.session.destroy();

      return createSuccessResponse("Logout successful");
   } catch (error) {
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
         poolMetadata: req.session?.poolMetadata
      });
      
      const userData = req.body;
      const schema =
         req.session?.schema || process.env.SEED_SCHEMA || "client_template";

      console.log("📝 [AUTH SERVICE] Registration attempt details:", {
         schema: schema,
         email: userData.email,
         name: userData.name,
         sessionContext: req.session?.poolContext,
         poolMetadata: req.session?.poolMetadata
      });

      if (!userData.name || !userData.email || !userData.password) {
         console.log("📝 [AUTH SERVICE] ❌ Missing required fields");
         throw new ValidationError("Name, email, and password are required");
      }

      // Check if user already exists
      console.log("📝 [AUTH SERVICE] Checking if user exists in schema:", schema);
      const existingUser = await repo.getUserByEmail(schema, userData.email);

      if (existingUser) {
         console.log("📝 [AUTH SERVICE] ❌ User already exists in schema:", schema, "email:", userData.email);
         throw new ValidationError("User with this email already exists");
      }

      console.log("📝 [AUTH SERVICE] ✅ User does not exist, proceeding with creation");

      // Create new user
      const role = userData.role || "user";
      console.log("📝 [AUTH SERVICE] Creating user in schema:", schema, "with role:", role);
      
      const result = await repo.createUser(schema, [
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
         schema: schema
      });

      return createSuccessResponse("Registration successful", {
         userId: result.lastID,
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
 * @returns {Object} User information
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

      return createSuccessResponse(
         "User retrieved successfully",
         removePasswordFromUser(user)
      );
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
