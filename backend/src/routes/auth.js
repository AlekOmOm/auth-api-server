import { Router } from "express";
const router = Router();

/** -- authentication of a normal user --
 *
 * responsible for:
 *  - login
 *  - logout
 *  - register
 *  - getCurrentUser
 *  - getSessions
 *
 * uses:
 *  - userService to interact with repository
 */

// --- controllers ---
import {
   register,
   login,
   logout,
   getCurrentUser,
   getSessions,
   getSession,
} from "../controllers/auth.js";

// --- middleware ---
import {
   hasRole,
   isAuthenticated,
   isNotAdmin,
   isAdminOrOwner,
} from "../middleware/auth.js";

// --- routes ---

router.post("/register", register);
router.post("/login", login);
router.post("/logout", isAuthenticated, logout);

/** very protected routes
 *   - only for current user (password protection)
 */
router.get("/me", isAuthenticated, isNotAdmin, getCurrentUser);
router.get("/admin", isAuthenticated, isAdminOrOwner, getCurrentUser);

// --- session ---
router.get("/session", isAuthenticated, getSession);
router.post("/sessions", isAuthenticated, getSessions);

// --- export ---
export default router;
