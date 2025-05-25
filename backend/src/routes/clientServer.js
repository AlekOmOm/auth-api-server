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
router.post("/register", async (req, res, next) => {
   try {
      const result = await clientServerService.registerClientServer(req);
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
         req
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
      const result = await clientServerService.getClientServerInfo(req);
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

// --- User Routes (require session authentication) ---

/**
 * Register client server for logged-in user
 * POST /api/clientServer/user/register
 */
router.post("/user/register", isAuthenticated, async (req, res, next) => {
   try {
      const result = await clientServerService.registerClientServerForUser(
         req.body,
         req // Pass entire request object
      );
      res.status(201).json(result);
   } catch (error) {
      next(error);
   }
});

/**
 * Get all client servers for authenticated user
 * GET /api/clientServer/user/clients
 */
router.get("/user/clients", isAuthenticated, async (req, res, next) => {
   try {
      const result = await clientServerService.getUserClientServers(req);
      res.json(result);
   } catch (error) {
      next(error);
   }
});

/**
 * Get specific client server for authenticated user
 * GET /api/clientServer/user/clients/:client_id
 */
router.get(
   "/user/clients/:client_id",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const result = await clientServerService.getUserClientServer(
            req,
            req.params.client_id
         );
         res.json(result);
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Update client server for authenticated user
 * PUT /api/clientServer/user/clients/:client_id
 */
router.put(
   "/user/clients/:client_id",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const result = await clientServerService.updateUserClientServer(
            req,
            req.params.client_id,
            req.body
         );
         res.json(result);
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Delete client server for authenticated user
 * DELETE /api/clientServer/user/clients/:client_id
 */
router.delete(
   "/user/clients/:client_id",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const result = await clientServerService.deleteUserClientServer(
            req,
            req.params.client_id
         );
         res.json(result);
      } catch (error) {
         next(error);
      }
   }
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
router.delete(
   "/:client_id",
   isAuthenticated,
   hasRole("admin"),
   async (req, res, next) => {
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
