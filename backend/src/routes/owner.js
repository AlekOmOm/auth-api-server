import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import {
   requireClientOwner,
   requireSystemAdmin,
} from "../services/poolService.js";
import * as ownerService from "../services/ownerService.js";

const router = express.Router();

/**
 * Owner Routes
 *
 * These routes are for client server owners to manage their applications
 * and users within their client schemas.
 *
 * All routes require authentication and owner/admin privileges.
 */

// --- Statistics Routes ---

/**
 * Get owner statistics and analytics
 * GET /api/owner/stats
 */
router.get("/stats", isAuthenticated, async (req, res, next) => {
   try {
      // Check if user has owner or admin privileges
      const userRole = req.session?.poolMetadata?.user_role;
      if (userRole !== "owner" && userRole !== "admin") {
         return res.status(403).json({
            success: false,
            message: "Owner or admin privileges required",
         });
      }

      const stats = await ownerService.getOwnerStatistics(req);
      res.json({
         success: true,
         data: stats,
      });
   } catch (error) {
      next(error);
   }
});

// --- User Management Routes ---

/**
 * Get all users in a specific client server schema
 * GET /api/owner/clients/:clientId/users
 */
router.get(
   "/clients/:clientId/users",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const { clientId } = req.params;
         const users = await ownerService.getClientUsers(req, clientId);

         res.json({
            success: true,
            data: users,
         });
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Create a new user in a specific client server schema
 * POST /api/owner/clients/:clientId/users
 */
router.post(
   "/clients/:clientId/users",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const { clientId } = req.params;
         const userData = req.body;

         const newUser = await ownerService.createClientUser(
            req,
            clientId,
            userData
         );

         res.status(201).json({
            success: true,
            data: newUser,
            message: "User created successfully",
         });
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Update a user in a specific client server schema
 * PUT /api/owner/clients/:clientId/users/:userId
 */
router.put(
   "/clients/:clientId/users/:userId",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const { clientId, userId } = req.params;
         const updateData = req.body;

         const updatedUser = await ownerService.updateClientUser(
            req,
            clientId,
            userId,
            updateData
         );

         res.json({
            success: true,
            data: updatedUser,
            message: "User updated successfully",
         });
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Delete a user from a specific client server schema
 * DELETE /api/owner/clients/:clientId/users/:userId
 */
router.delete(
   "/clients/:clientId/users/:userId",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const { clientId, userId } = req.params;

         await ownerService.deleteClientUser(req, clientId, userId);

         res.json({
            success: true,
            message: "User deleted successfully",
         });
      } catch (error) {
         next(error);
      }
   }
);

/**
 * Get specific user details in a client server schema
 * GET /api/owner/clients/:clientId/users/:userId
 */
router.get(
   "/clients/:clientId/users/:userId",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const { clientId, userId } = req.params;

         const user = await ownerService.getClientUser(req, clientId, userId);

         res.json({
            success: true,
            data: user,
         });
      } catch (error) {
         next(error);
      }
   }
);

// --- Client Server Analytics Routes ---

/**
 * Get analytics for a specific client server
 * GET /api/owner/clients/:clientId/analytics
 */
router.get(
   "/clients/:clientId/analytics",
   isAuthenticated,
   async (req, res, next) => {
      try {
         const { clientId } = req.params;

         const analytics = await ownerService.getClientAnalytics(req, clientId);

         res.json({
            success: true,
            data: analytics,
         });
      } catch (error) {
         next(error);
      }
   }
);

export default router;
