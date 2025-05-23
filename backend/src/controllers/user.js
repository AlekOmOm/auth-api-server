// --- services ---
import * as userService from "../services/userService.js";

// --- utils ---
import { getSchemaFromRequest } from "../middleware/schemaDetection.js";

// --- User Controller ---

/**
 * @description Get all users (admin)
 * Calls userService.getUsers with schema from request
 */
const getAllUsers = async (req, res, next) => {
   try {
      const schema = getSchemaFromRequest(req);
      const result = await userService.getUsers(schema);
      res.status(200).json(result);
   } catch (error) {
      next(error); // Pass error to global error handler
   }
};

/**
 * @description Get a single user by ID (admin)
 * Calls userService.getUserById with schema from request
 */
const getUserById = async (req, res, next) => {
   try {
      const userId = req.params.id;
      if (!userId) {
         // Basic validation - could use a validation middleware too
         return res
            .status(400)
            .json({ message: "User ID parameter is required." });
      }
      const schema = getSchemaFromRequest(req);
      const result = await userService.getUserById(userId, schema);
      // Assuming service returns null/undefined or throws if not found handled by error handler
      res.status(200).json(result);
   } catch (error) {
      next(error);
   }
};

/**
 * @description Create a new user (admin)
 * Calls userService.createUser with schema from request
 */
const createUser = async (req, res, next) => {
   try {
      const userData = req.body;
      if (!userData || Object.keys(userData).length === 0) {
         return res.status(400).json({
            message: "User data in body is required.",
         });
      }
      const schema = getSchemaFromRequest(req);
      const result = await userService.createUser(userData, schema);
      res.status(201).json(result);
   } catch (error) {
      next(error);
   }
};

/**
 * @description Update a user by ID (admin)
 * Calls userService.updateUser with schema from request
 */
const updateUser = async (req, res, next) => {
   try {
      const userId = req.params.id;
      const userData = req.body;
      if (!userId || !userData || Object.keys(userData).length === 0) {
         return res.status(400).json({
            message: "User ID parameter and user data in body are required.",
         });
      }
      const schema = getSchemaFromRequest(req);
      const result = await userService.updateUser(userId, userData, schema);
      res.status(200).json(result);
   } catch (error) {
      next(error);
   }
};

/**
 * @description Delete a user by ID (admin)
 * Calls userService.deleteUser with schema from request
 */
const deleteUser = async (req, res, next) => {
   try {
      const userId = req.params.id;
      if (!userId) {
         return res
            .status(400)
            .json({ message: "User ID parameter is required." });
      }
      const schema = getSchemaFromRequest(req);
      const result = await userService.deleteUser(userId, schema);
      res.status(200).json(result);
   } catch (error) {
      next(error);
   }
};

// --- export ---
export { getAllUsers, getUserById, createUser, updateUser, deleteUser };
