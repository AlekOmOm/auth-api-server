// --- services ---
import * as authService from "../services/auth.js";

// --- utils ---

// --- controller ---
/**
 * auth controller
 *   - register
 *   - login
 *   - logout
 *   - getCurrentUser
 *
 * All functions now use schema from request context (session or API token)
 */

/**
 * @description logic for registering a new user
 * Calls authService.register with schema from request
 */
const register = async (req, res, next) => {
   try {
      console.log("🎯 [AUTH CONTROLLER] Register request received");
      console.log(
         "🎯 [AUTH CONTROLLER] Request body:",
         JSON.stringify(req.body, null, 2)
      );
      console.log("🎯 [AUTH CONTROLLER] Session data:", {
         poolContext: req.session?.poolContext,
         schema: req.session?.schema,
         poolMetadata: req.session?.poolMetadata,
      });

      const result = await authService.register(req);

      console.log("🎯 [AUTH CONTROLLER] ✅ Registration successful");
      res.status(201).json(result); // 201 Created for registration
   } catch (error) {
      console.log(
         "🎯 [AUTH CONTROLLER] ❌ Registration failed:",
         error.message
      );
      next(error); // Pass error to global error handler
   }
};

/**
 * @description logic for logging in
 * Calls authService.login with schema from request
 */
const login = async (req, res, next) => {
   try {
      console.log("🎯 [AUTH CONTROLLER] Login request received");
      console.log(
         "🎯 [AUTH CONTROLLER] Request body:",
         JSON.stringify(req.body, null, 2)
      );
      console.log("🎯 [AUTH CONTROLLER] Session data:", {
         poolContext: req.session?.poolContext,
         schema: req.session?.schema,
         poolMetadata: req.session?.poolMetadata,
      });

      /**
       * req.body and req.session data:
       * - body:
       *    {
       *       email: string,
       *       password: string,
       *    }
       * - session:
       *    {
       *       poolContext: POOL_CONTEXTS.CLIENT_TENANT,
       *       schema: string,
       *       poolMetadata: {
       *          ...
       *       }
       *    }
       */
      const result = await authService.login(req);

      console.log("🎯 [AUTH CONTROLLER] ✅ Login successful");
      res.status(200).json(result);
   } catch (error) {
      console.log("🎯 [AUTH CONTROLLER] ❌ Login failed:", error.message);
      next(error); // Pass error to global error handler
   }
};

/**
 * @description logic for logging out
 * Calls authService.logout with schema from request
 */
const logout = async (req, res, next) => {
   try {
      const result = await authService.logout(req);
      res.status(200).json(result);
   } catch (error) {
      next(error); // Pass error to global error handler
   }
};

// --- session ---

/**
 * @description Get all sessions for the current user
 * Calls authService.getSessions with schema from request
 */
const getSessions = async (req, res, next) => {
   try {
      const result = await authService.getSessions(req);
      res.status(200).json(result);
   } catch (error) {
      next(error);
   }
};

/**
 * @description Get a specific session by ID
 * Calls authService.getSession with schema from request
 */
const getSession = async (req, res, next) => {
   try {
      const result = await authService.getSession(req);
      res.status(200).json(result);
   } catch (error) {
      next(error);
   }
};

// ---- getCurrentUser ---
/**
 * @description Get current user details
 * Calls authService.getCurrentUser with schema from request
 */
const getCurrentUser = async (req, res, next) => {
   try {
      const result = await authService.getCurrentUser(req);
      res.status(200).json(result);
   } catch (error) {
      next(error); // Pass error to global error handler
   }
};

// --- export ---
export { register, login, logout, getCurrentUser, getSessions, getSession };
