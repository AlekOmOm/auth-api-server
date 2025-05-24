import { AuthError, ValidationError } from "../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";
import db from "../db/userRepository.js"; // Import the repository

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
 * Login a user and create a session
 * @param {Object} credentials - User credentials (email, password)
 * @param {Object} session - Express session object
 * @param {string} schema - Database schema (retrieved from session/request context)
 * @returns {Object} Login success response
 */
export async function login(credentials, session, schema) {
   try {
      if (!credentials.email || !credentials.password) {
         throw new ValidationError("Email and password are required");
      }

      const user = await db.getUserByEmail(schema, credentials.email);

      if (!user) {
         throw new AuthError("Invalid credentials");
      }

      // Verify password (using hash comparison in a real implementation)
      if (user.password_hash !== credentials.password) {
         throw new AuthError("Invalid credentials");
      }

      // Set session data
      session.userId = user.id;
      session.role = user.role;
      // Schema is already in session from middleware

      // Create session in database for tracking
      const sessionId = uuidv4();
      await db.createSession(schema, [user.id, sessionId]);

      /**
       * returns:
       * {
       *    message: ...,
       *    data: {
       *       userId: ...,
       *       role: ...,
       *       email: ...,
       *       name: ...,
       *       allowedUrls: [...],
       *    },
       * }
       */
      const userResponseData = removePasswordFromUser(user);
      return createSuccessResponse("Login successful", userResponseData);
   } catch (error) {
      throw error;
   }
}

/**
 * Logout a user and destroy their session
 * @param {Object} session - Express session object
 * @param {string} schema - Database schema (retrieved from session/request context)
 * @returns {Object} Logout success response
 */
export async function logout(session, schema) {
   try {
      if (!session || !session.userId) {
         throw new AuthError("No active session");
      }

      // Delete session from database
      await db.deleteSessionByUserId(schema, session.userId);

      // Destroy session
      session.destroy();

      return createSuccessResponse("Logout successful");
   } catch (error) {
      throw error;
   }
}

/**
 * Register a new user
 * @param {Object} userData - User data (name, email, password)
 * @param {string} schema - Database schema (retrieved from session/request context)
 * @returns {Object} Registration success response
 */
export async function register(userData, schema) {
   try {
      if (!userData.name || !userData.email || !userData.password) {
         throw new ValidationError("Name, email, and password are required");
      }

      // Check if user already exists
      const existingUser = await db.getUserByEmail(schema, userData.email);

      if (existingUser) {
         throw new ValidationError("User with this email already exists");
      }

      // Create new user
      const role = userData.role || "user";
      const result = await db.createUser(schema, [
         userData.name,
         role,
         userData.email,
         userData.password, // In a real app, hash the password
      ]);

      return createSuccessResponse("Registration successful", {
         userId: result.lastID,
      });
   } catch (error) {
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
      const sessions = await db.getSessions(schema, session.userId);
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
      const sessionData = await db.getSession(schema, sessionId);
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
 * @param {Object} session - Express session object
 * @param {string} schema - Database schema (retrieved from session/request context)
 * @returns {Object} User information
 */
export async function getCurrentUser(session, schema) {
   try {
      if (!session || !session.userId) {
         throw new AuthError("Authentication required");
      }

      const user = await db.getUser(schema, session.userId);

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
