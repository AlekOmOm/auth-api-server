import { Router } from "express";
const router = Router();

// --- controllers ---
import {
  register,
  login,
  logout,
  getCurrentUser,
  getSessions,
} from "../controllers/auth.js";

// --- middleware ---
import { hasRole, isAuthenticated, isNotAdmin } from "../middleware/auth.js";

// --- utils ---
import validation from "../utils/validation.js"; // types and XSS

// --- routes ---
router.post("/register", validation.register, register);
router.post("/login", validation.login, login);
router.post("/logout", validation.logout, isAuthenticated, logout);

/** very protected routes
 *   - only for current user (password protection)
 */
router.get("/me", isAuthenticated, isNotAdmin, getCurrentUser);
router.get("/admin", isAuthenticated, hasRole("admin"), getCurrentUser);

// --- session ---
router.get("/session", isAuthenticated, getCurrentUser);
router.post("/sessions", isAuthenticated, getSessions);

// --- export ---
export default router;
