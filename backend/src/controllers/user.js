// --- services ---
import * as userService from "../services/user.js";
import { getSchema } from "../utils/request/session.js";
import { standardizeResponse } from "../utils/responseUtils.js";
import asyncErrorHandler from "../utils/asyncErrorHandler.js";
import {
   NotFoundError,
   ValidationError,
   AuthError,
   ConflictError,
} from "../utils/customErrors.js";

// --- User Controller ---

/**
 * @description Get all users (admin)
 * Extracts schema from session and calls userService.getUsers
 */
const getAllUsersController = async (req, res, next) => {
   const schema = req.schema;
   if (!schema) {
      throw new ValidationError(
         "Schema could not be determined for the request."
      );
   }
   const serviceResult = await userService.getUsers(schema);
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * @description Get a single user by ID (admin)
 * Extracts userId and schema, then calls userService.getUserById
 */
const getUserByIdController = async (req, res, next) => {
   const userId = req.params.id;
   if (!userId) {
      throw new ValidationError("User ID parameter is required.", [
         { field: "id", message: "User ID is missing in path parameters." },
      ]);
   }
   const schema = req.schema;
   if (!schema) {
      throw new ValidationError(
         "Schema could not be determined for the request."
      );
   }
   const serviceResult = await userService.getUserById(userId, schema);
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * @description Create a new user (admin)
 * Extracts user data and schema, then calls userService.createUser
 */
const createUserController = async (req, res, next) => {
   const userData = req.body;
   if (!userData || Object.keys(userData).length === 0) {
      throw new ValidationError("User data in body is required.", [
         { field: "body", message: "Request body is empty." },
      ]);
   }
   if (
      !userData.name ||
      !userData.email ||
      !userData.password ||
      !userData.role
   ) {
      throw new ValidationError(
         "Missing required fields for user creation.",
         [
            !userData.name && { field: "name", message: "Name is required" },
            !userData.email && { field: "email", message: "Email is required" },
            !userData.password && {
               field: "password",
               message: "Password is required",
            },
            !userData.role && { field: "role", message: "Role is required" },
         ].filter(Boolean)
      );
   }

   const schema = req.schema;
   if (!schema) {
      throw new ValidationError(
         "Schema could not be determined for the request."
      );
   }
   const serviceResult = await userService.createUser(userData, schema);
   res.status(201).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * @description Update a user by ID (admin)
 * Extracts userId, user data, and schema, then calls userService.updateUser
 */
const updateUserController = async (req, res, next) => {
   const userId = req.params.id;
   const userData = req.body;
   if (!userId) {
      throw new ValidationError("User ID parameter is required.", [
         { field: "id", message: "User ID is missing in path parameters." },
      ]);
   }
   if (!userData || Object.keys(userData).length === 0) {
      throw new ValidationError("User data in body is required for update.", [
         { field: "body", message: "Request body is empty." },
      ]);
   }

   const schema = req.schema;
   if (!schema) {
      throw new ValidationError(
         "Schema could not be determined for the request."
      );
   }
   const serviceResult = await userService.updateUser(userId, userData, schema);
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

/**
 * @description Delete a user by ID (admin)
 * Extracts userId and schema, then calls userService.deleteUser
 */
const deleteUserController = async (req, res, next) => {
   const userId = req.params.id;
   if (!userId) {
      throw new ValidationError("User ID parameter is required.", [
         { field: "id", message: "User ID is missing in path parameters." },
      ]);
   }
   const schema = req.schema;
   if (!schema) {
      throw new ValidationError(
         "Schema could not be determined for the request."
      );
   }
   const serviceResult = await userService.deleteUser(userId, schema);
   res.status(200).json(
      standardizeResponse({
         data: serviceResult.data,
         message: serviceResult.message,
      })
   );
};

// --- export ---
export const getAllUsers = asyncErrorHandler(getAllUsersController);
export const getUserById = asyncErrorHandler(getUserByIdController);
export const createUser = asyncErrorHandler(createUserController);
export const updateUser = asyncErrorHandler(updateUserController);
export const deleteUser = asyncErrorHandler(deleteUserController);
