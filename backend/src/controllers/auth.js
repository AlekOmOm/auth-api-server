// --- services ---
// import userService from "../services/userService.js"; // Removed userService
import * as authService from "../services/auth.js"; // Import authService

// --- utils ---
// import hashing from "../utils/hashing.js"; // No longer needed here
import { json } from "express"; // Keep if needed, but likely service handles response format

// --- controller ---
/**
 * auth controller
 *   - register
 *   - login
 *   - logout
 *   - getCurrentUser
 */

/**
 * @description logic for registering a new user
 * Calls authService.register
 */
const register = async (req, res, next) => {
  try {
    // Service handles validation and creation
    const result = await authService.register(req.body);
    // Assuming service throws ValidationError or other errors on failure
    // Assuming service returns success object { message, data }
    res.status(201).json(result); // 201 Created for registration
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

/**
 * @description logic for logging in
 * Calls authService.login
 */
const login = async (req, res, next) => {
  try {
    // Service handles validation, user lookup, password check, session creation
    const result = await authService.login(req.body, req.session);
    // Assuming service throws AuthError/ValidationError on failure
    // Assuming service returns success object { message, data }
    res.status(200).json(result);
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

/**
 * @description logic for logging out
 * Calls authService.logout
 */
const logout = async (req, res, next) => {
  try {
    // Service handles session destruction
    const result = await authService.logout(req.session);
    // Assuming service throws AuthError if no session
    // Assuming service returns success object { message }
    res.status(200).json(result);
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

// --- session ---

/**
 * @description Get all sessions for the current user
 * Calls authService.getSessions
 */
const getSessions = async (req, res, next) => {
  try {
    const result = await authService.getSessions(req.session);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @description Get a specific session by ID
 * Calls authService.getSession
 */
const getSession = async (req, res, next) => {
  try {
    const result = await authService.getSession(
      req.session,
      req.params.sessionId
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// ---- getCurrentUser ---
/**
 * @description Get current user details
 * Calls authService.getCurrentUser
 */
const getCurrentUser = async (req, res, next) => {
  try {
    // Service handles checking session and fetching user
    const result = await authService.getCurrentUser(req.session);
    // Assuming service throws AuthError if no session/user
    // Assuming service returns success object { message, data: user }
    res.status(200).json(result);
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

// --- export ---
// Exporting named exports as before
export { register, login, logout, getCurrentUser, getSessions, getSession };
