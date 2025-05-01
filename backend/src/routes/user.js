import Router from "express";

const router = Router();

// --- services ---
// import userService from "../services/userService.js"; // No longer needed here

// --- controllers ---
import {
  getAllUsers,
  getUserById,
  updateUser,
  // Import createUser, deleteUser controllers when added
} from "../controllers/user.js";

// --- middleware ---
import { hasRole } from "../middleware/auth.js";

// --- routes ---
// Apply isAdmin middleware if these routes are admin-only
router.get("/", /*hasRole("user"),*/ getAllUsers);
router.get("/:id", /*hasRole("user"),*/ getUserById);
router.put("/:id", /*hasRole("user"),*/ updateUser);

// Add routes for createUser and deleteUser when controllers are ready
// router.post("/", /* isAdmin, */ createUserController);
// router.delete("/:id", /* isAdmin, */ deleteUserController);

// --- export ---
export default router;
