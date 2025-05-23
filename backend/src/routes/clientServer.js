import express from "express";
import clientServerService from "../services/clientServerService.js";
import { authenticateClientServer } from "../middleware/clientServerAuth.js";
import { isAuthenticated, hasRole } from "../middleware/auth.js";

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
 * Admin routes:
 * - GET /:client_id - Get client server by ID
 * - DELETE /:client_id - Delete client server
 */

// --- Public Routes ---

/**
 * Register a new client server
 * POST /api/clientServer/register
 */
router.post("/register", async (req, res, next) => {
   try {
      const result = await clientServerService.registerClientServer(req.body);
      res.status(201).json(result);
   } catch (error) {
      next(error);
   }
});

/**
 * Client server handshake - authenticate and get API token
 * POST /api/clientServer/handshake
 */
router.post("/handshake", async (req, res, next) => {
   try {
      const result = await clientServerService.authenticateClientServer(
         req.body
      );
      res.json(result);
   } catch (error) {
      next(error);
   }
});

// --- Protected Routes (require API token) ---

/**
 * Get current client server information
 * GET /api/clientServer/me
 */
router.get("/me", authenticateClientServer, async (req, res, next) => {
   try {
      const result = await clientServerService.getClientServerInfo(
         req.clientContext.client_id
      );
      res.json(result);
   } catch (error) {
      next(error);
   }
});

/**
 * Update current client server information
 * PUT /api/clientServer/me
 */
router.put("/me", authenticateClientServer, async (req, res, next) => {
   try {
      const result = await clientServerService.updateClientServer(
         req.clientContext.client_id,
         req.body
      );
      res.json(result);
   } catch (error) {
      next(error);
   }
});

// --- Admin Routes (require admin role) ---

/**
 * Get client server by ID (admin only)
 * GET /api/clientServer/:client_id
 */
router.get(
   "/:client_id",
   isAuthenticated,
   hasRole("admin"),
   async (req, res, next) => {
      try {
         const result = await clientServerService.getClientServerInfo(
            req.params.client_id
         );
         res.json(result);
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Delete client server (admin only)
 * DELETE /api/clientServer/:client_id
 */
router.delete(   "/:client_id",   isAuthenticated,   hasRole("admin"),   async (req, res, next) => {
      try {
         const result = await clientServerService.deleteClientServer(
            req.params.client_id
         );
         res.json(result);
      } catch (error) {
         next(error);
      }
   }
);

export default router;
