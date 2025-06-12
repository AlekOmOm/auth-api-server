import {
   ValidationError,
   ConflictError,
   NotFoundError,
   AuthError,
} from "../utils/customErrors.js";
import hashing from "../utils/hashing.js";
import Repo from "../repo/index.js";
import { User, UserOperations } from "../models/index.js"; // Import the User model

// --- Pipeline Pattern Components ---

const TABLE = "users";
const repo = (schema) => new Repo(schema, TABLE);
const repoQuery = (schema, operationName) => (instance) =>
   repo(schema).query(operationName, instance);

/**
 * Pipeline function for service operations.
 * @param {class} model - The model class (e.g., User).
 * @param {function} executor - The repoQuery function prepared for execution.
 * @param {string} successMessage - Success message.
 * @param  {...any} args - Arguments for model.fromRequestBody.
 */
const pipeline = async (model, executor, successMessage, ...args) => {
   let instance;
   try {
      // Create and validate the model instance from request arguments.
      // This step can throw ValidationError if requestBody is invalid.
      instance = await model.fromRequestBody(...args);
   } catch (error) {
      // If fromRequestBody throws (e.g., ValidationError), propagate it directly.
      // These errors are already structured for client consumption.
      throw error;
   }

   try {
      // Execute the repository operation (e.g., database query).
      const result = await executor(instance);

      // Handle cases where the repository operation indicates "not found".
      if (result === null) {
         throw new NotFoundError(`${model.name} not found.`);
      }

      // Handle cases where the repository returns a custom error object
      // (e.g., if the repo catches DB errors and wraps them).
      if (
         typeof result === "object" &&
         result.error &&
         !(result instanceof Error)
      ) {
         const repoError = result.error; // This could be a DB error object or details.
         const repoMessage =
            result.message || `Repository operation failed for ${model.name}.`;

         // Check for PostgreSQL unique_violation (error code '23505').
         if (typeof repoError === "object" && repoError.code === "23505") {
            if (
               model.name === "User" &&
               instance.email &&
               repoError.constraint &&
               repoError.constraint.includes("email")
            ) {
               throw new ConflictError(
                  "An account with this email already exists. Please try logging in."
               );
            } else {
               throw new ConflictError(
                  `A record with a conflicting unique value already exists (constraint: ${
                     repoError.constraint || "unknown"
                  }).`
               );
            }
         }
         // For other types of repo-returned errors, wrap them in a generic Error.
         // This makes it a server-side error to be handled by the global error handler.
         throw new Error(repoMessage);
      }

      // If the repository itself threw an error that wasn't a custom error object (e.g. direct throw)
      // This might be redundant if the main catch block handles it, but good for clarity.
      if (result instanceof Error) {
         throw result; // Will be caught by the outer catch block.
      }

      // If execution was successful and no errors were indicated.
      return {
         success: true,
         data: result,
         message: successMessage,
      };
   } catch (error) {
      // This block catches:
      // 1. Errors thrown directly by the executor (repo call).
      // 2. Errors re-thrown from the checks above (NotFoundError, ConflictError from repoError, generic Error from repoError).
      // 3. Errors like 'result instanceof Error' re-thrown.

      // If it's one of our specific custom errors, re-throw it as is.
      if (
         error instanceof NotFoundError ||
         error instanceof ConflictError ||
         error instanceof ValidationError
      ) {
         throw error;
      }

      // Specifically handle raw PostgreSQL unique_violation errors if they reach here.
      if (error.code === "23505") {
         if (
            model.name === "User" &&
            instance.email &&
            error.constraint &&
            error.constraint.includes("email")
         ) {
            throw new ConflictError(
               "An account with this email already exists. Please try logging in."
            );
         } else {
            throw new ConflictError(
               `A record with a conflicting unique value already exists (constraint: ${
                  error.constraint || "unknown"
               }).`
            );
         }
      }

      // For any other unexpected errors caught at this stage.
      console.error(
         `Service pipeline error for ${model.name} (instance details might be in 'instance' object):`,
         error
      );
      // Throw a generic error message for the client. The global error handler will format it.
      throw new Error(
         `Service operation failed for ${model.name}. Please try again later.`
      );
   }
};

// ---- Service Functions ----

/**
 * Read all users
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with users or error
 */
export async function getUsers(schema) {
   try {
      const result = await repo(schema).query("getAll", {});

      if (result === null) {
         throw new NotFoundError("No users found.");
      }

      if (
         typeof result === "object" &&
         result.error &&
         !(result instanceof Error)
      ) {
         throw new Error("Repository operation failed for User.");
      }

      if (result instanceof Error) {
         throw result;
      }

      return {
         success: true,
         data: result,
         message: "Users retrieved successfully",
      };
   } catch (error) {
      if (
         error instanceof NotFoundError ||
         error instanceof ConflictError ||
         error instanceof ValidationError
      ) {
         throw error;
      }

      console.error("Service error for getUsers:", error);
      throw new Error(
         "Service operation failed for User. Please try again later."
      );
   }
}

/**
 * Get user by id or by name and email. Handles login check.
 * - aggregate operation for
 *   - get user by id or name and email
 *   - login logic
 *     - check password
 *     - remove password from response
 * @param {Object} params
 * @requires schema
 * @requires id || name && email
 * @returns {Object} response {
 *   message: string,
 *   data: {
 *     user: {
 *       id: string,
 *       name: string,
 *       email: string,
 *       role: string,
 *     },
 *     schema: string,
 *   }
 * }
 */
export async function get({
   id = null,
   name = null,
   email = null,
   schema,
   password = null,
   returnPwd = false,
}) {
   let userResult;

   if (id) {
      userResult = await getUserById(id, schema);
   } else if (name && email) {
      userResult = await getUserByNameAndEmail({ name, email, schema });
   } else if (email) {
      // For authentication, we can lookup by email only
      userResult = await getUserByNameAndEmail({ name: null, email, schema });
   } else {
      // This case should ideally be caught by validation before service call
      return {
         success: false,
         error: new ValidationError("User ID or name and email are required."),
         message: "User ID or name and email are required.",
      };
   }

   if (!userResult || !userResult.success || !userResult.data) {
      return {
         success: false,
         error: userResult?.error || new Error("User not found."),
         message: userResult?.message || "User not found.",
      };
   }

   const userFromDb = userResult.data;

   // Debug logging to understand password validation issue
   console.log(
      "[USER SERVICE GET] userFromDb object:",
      JSON.stringify(userFromDb, null, 2)
   );
   console.log(
      "[USER SERVICE GET] userFromDb.passwordHash:",
      userFromDb.passwordHash
   );
   console.log(
      "[USER SERVICE GET] userFromDb.password_hash:",
      userFromDb.password_hash
   );
   console.log(
      "[USER SERVICE GET] password provided:",
      password ? "yes" : "no"
   );

   // Login specific logic: Check password if provided
   if (password) {
      if (
         !userFromDb.passwordHash || // Fixed: User model uses passwordHash (camelCase), not password_hash (snake_case)
         !hashing.same(password, userFromDb.passwordHash)
      ) {
         return {
            success: false,
            error: new ValidationError("Password is incorrect."),
            message: "Password is incorrect.",
         };
      }
   }

   let finalUserData = { ...userFromDb }; // Clone user data
   if (!returnPwd && finalUserData.hasOwnProperty("passwordHash")) {
      delete finalUserData.passwordHash; // Remove sensitive info
   }
   if (!returnPwd && finalUserData.hasOwnProperty("password")) {
      // also if it was named password
      delete finalUserData.password;
   }

   return {
      success: true,
      data: finalUserData,
      message: "User retrieved successfully.",
   };
}

/**
 * Read user by id
 * @param {string} id - User ID
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with user or error
 */
export async function getUserById(id, schema) {
   return await pipeline(
      User,
      repoQuery(schema, "get"),
      "User retrieved successfully by ID.",
      { id }
   );
}

/**
 * Read user by name and email
 * @param {Object} params - Parameters object
 */
export async function getUserByNameAndEmail({ name, email, schema }) {
   return await pipeline(
      User,
      repoQuery(schema, "getByEmail"),
      "User retrieved successfully by email.",
      { email }
   );
}

/**
 * Create user
 * @param {Object} userData - User data (name, email, password, role?)
 * @param {string} schema - The database schema
 */
export async function createUser(userData, schema) {
   return await pipeline(
      User,
      repoQuery(schema, "create"),
      "User created successfully",
      userData
   );
}

/**
 * Update user
 * @param {string} id - User ID
 * @param {Object} userUpdateData - Fields to update
 * @param {string} schema - The database schema
 */
export async function updateUser(id, userUpdateData, schema) {
   return await pipeline(
      User,
      repoQuery(schema, "update"),
      "User updated successfully",
      User.update(userUpdateData, await getUserById(id, schema))
   );
}

/**
 * Delete user
 * @param {string} id - User ID
 * @param {string} schema - The database schema
 */
export async function deleteUser(id, schema) {
   return await pipeline(
      User,
      repoQuery(schema, "delete"),
      "User deleted successfully",
      id
   );
}

export default {
   getUsers,
   get,
   getUserById,
   getUserByNameAndEmail,
   createUser,
   updateUser,
   deleteUser,
};
