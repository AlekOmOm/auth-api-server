// --- services ---
import * as userService from "../services/user.js";
import { getSchema } from "../utils/session.js";
import { standardizeResponse } from "../utils/responseUtils.js";

// --- User Controller ---

/**
 * @description Get all users (admin)
 * Extracts schema from session and calls userService.getUsers
 */
const getAllUsers = async (req, res, next) => {
   try {
      const schema = getSchema(req);
      const serviceResult = await userService.getUsers(schema);
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * @description Get a single user by ID (admin)
 * Extracts userId and schema, then calls userService.getUserById
 */
const getUserById = async (req, res, next) => {
   try {
      const userId = req.params.id;
      if (!userId) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("User ID parameter is required."),
               statusCode: 400,
            })
         );
      }

      const schema = getSchema(req);
      const serviceResult = await userService.getUserById(userId, schema);
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * @description Create a new user (admin)
 * Extracts user data and schema, then calls userService.createUser
 */
const createUser = async (req, res, next) => {
   try {
      const userData = req.body;
      if (!userData || Object.keys(userData).length === 0) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("User data in body is required."),
               statusCode: 400,
            })
         );
      }

      const schema = getSchema(req);
      const serviceResult = await userService.createUser(userData, schema);
      res.status(201).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * @description Update a user by ID (admin)
 * Extracts userId, user data, and schema, then calls userService.updateUser
 */
const updateUser = async (req, res, next) => {
   try {
      const userId = req.params.id;
      const userData = req.body;
      if (!userId || !userData || Object.keys(userData).length === 0) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error(
                  "User ID parameter and user data in body are required."
               ),
               statusCode: 400,
            })
         );
      }

      const schema = getSchema(req);
      const serviceResult = await userService.updateUser(
         userId,
         userData,
         schema
      );
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

/**
 * @description Delete a user by ID (admin)
 * Extracts userId and schema, then calls userService.deleteUser
 */
const deleteUser = async (req, res, next) => {
   try {
      const userId = req.params.id;
      if (!userId) {
         return res.status(400).json(
            standardizeResponse({
               error: new Error("User ID parameter is required."),
               statusCode: 400,
            })
         );
      }

      const schema = getSchema(req);
      const serviceResult = await userService.deleteUser(userId, schema);
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message,
         })
      );
   } catch (error) {
      next(error);
   }
};

// --- export ---
export { getAllUsers, getUserById, createUser, updateUser, deleteUser };
