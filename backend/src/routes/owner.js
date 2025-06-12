import express from "express";
import { isAuthenticated, isAdminOrOwner } from "../middleware/auth.js";
import { detectSchema } from "../middleware/detection.js";
import * as ownerPanelService from "../services/ownerPanel.js";

const router = express.Router();

/**
 * Owner Routes
 *
 * These routes are for client server owners to manage their applications
 * and users within their client schemas.
 *
 * All routes require authentication and owner/admin privileges.
 * Uses the enhanced role detection system for proper authorization.
 */

// --- Statistics Routes ---

/**
 * Get owner statistics and analytics
 * GET /api/owner/stats
 */
router.get(
   "/stats",
   isAuthenticated,
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const ownerId = req.session?.userId || req.user?.id;
         if (!ownerId) {
            return res
               .status(401)
               .json({
                  success: false,
                  message:
                     "User not authenticated or ownerId not found in session.",
               });
         }
         const stats = await ownerPanelService.getOwnerAnalytics({ ownerId });
         res.json({
            success: true,
            data: stats.data,
         });
      } catch (error) {
         next(error);
      }
   }
);

// --- User Management Routes ---

/**
 * Get all users in a specific client server schema
 * GET /api/owner/clients/:clientId/users
 */
router.get(
   "/clients/:clientId/users",
   isAuthenticated,
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const { clientId } = req.params;
         const users = await ownerPanelService.getClientUsers(req, clientId);

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
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const { clientId } = req.params;
         const userData = req.body;

         const newUser = await ownerPanelService.createClientUser(
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
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const { clientId, userId } = req.params;
         const updateData = req.body;

         const updatedUser = await ownerPanelService.updateClientUser(
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
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const { clientId, userId } = req.params;

         await ownerPanelService.deleteClientUser(req, clientId, userId);

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
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const { clientId, userId } = req.params;

         const user = await ownerPanelService.getClientUser(
            req,
            clientId,
            userId
         );

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
   detectSchema,
   isAdminOrOwner,
   async (req, res, next) => {
      try {
         const { clientId } = req.params;

         const analytics = await ownerPanelService.getClientAnalytics(
            req,
            clientId
         );

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
