import express from "express";
import * as service from "../services/clientServer.js";
import { authenticateClientServer } from "../middleware/clientServerAuth.js";
import { isAuthenticated, hasRole } from "../middleware/auth.js";
import * as controller from "../controllers/clientServer.js";
const router = express.Router();

/**
 * Client Server Routes
 *
 * Public routes:
 * - POST /register - Register a new client server
 * - POST /handshake - Authenticate client server and get API token
 *
 * Protected routes (require API token):
 * - GET /me - Get current client server info
 * - PUT /me - Update current client server info
 *
 * User routes (require session authentication):
 * - POST /user/register - Register client server for logged-in user
 * - GET /user/clients - Get all client servers for user
 * - GET /user/clients/:client_id - Get specific client server for user
 * - PUT /user/clients/:client_id - Update client server for user
 * - DELETE /user/clients/:client_id - Delete client server for user
 *
 * Admin routes (require admin role):
 * - GET /:client_id - Get client server by ID
 * - DELETE /:client_id - Delete client server
 */

// --- Public Routes ---

/**
 * Register a new client server
 * POST /api/clientServer/register
 */
router.post("/register", controller.registerClientServer);
/**
 * Client server handshake - authenticate and get API token
 * POST /api/clientServer/handshake
 */
router.post("/handshake", controller.handshake);
// --- Protected Routes (require API token) ---

/**
 * Get current client server information
 * GET /api/clientServer/me
 */
router.get("/me", authenticateClientServer, controller.getClientServerInfo);

/**
 * Update current client server information
 * PUT /api/clientServer/me
 */
router.put("/me", authenticateClientServer, controller.updateClientServerInfo);
// --- User Routes (require session authentication) ---

/**
 * Register client server for logged-in user
 * POST /api/clientServer/user/register
 */
router.post("/user/register", isAuthenticated, controller.registerClientServerForUser);

/**
 * Get all client servers for authenticated user
 * GET /api/clientServer/user/clients
 */
router.get("/user/clients", isAuthenticated, controller.getUserClientServers);
/**
 * Get specific client server for authenticated user
 * GET /api/clientServer/user/clients/:client_id
 */
router.get(
   "/user/clients/:client_id",
   isAuthenticated,
   controller.getUserClientServerById
);

/**
 * Update client server for authenticated user
 * PUT /api/clientServer/user/clients/:client_id
 */
router.put(
   "/user/clients/:client_id",
   isAuthenticated,
   controller.updateUserClientServerById
);

/**
 * Delete client server for authenticated user
 * - owner only
 * DELETE /api/clientServer/user/clients/:client_id
 */
router.delete(
   "/user/clients/:client_id",
   isAuthenticated,
   controller.deleteUserClientServerById
);

// --- Admin Routes (require admin role) ---

/**
 * Get client server by ID (admin only)
 * GET /api/clientServer/:client_id
 */
router.get(
   "/:client_id",
   isAuthenticated,
   hasRole("admin"),
   controller.getClientServerById
);

/**
 * Delete client server (admin only)
 * DELETE /api/clientServer/:client_id
 */
router.delete(
   "/:client_id",
   isAuthenticated,
   hasRole("admin"),
   controller.deleteClientServerById
);

export default router;
