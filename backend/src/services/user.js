import { ValidationError } from "../middleware/errorHandler.js";
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
 * @param {string} message - Success message.
 * @param  {...any} args - Arguments for model.fromRequestBody.
 */
const pipeline = async (model, executor, message, ...args) => {
   const instance = await model.fromRequestBody(...args);
   const result = await executor(instance);
   return {
      message: message,
      data: result,
   };
};

// ---- Service Functions ----

/**
 * Read all users
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with users or error
 */
export async function getUsers(schema) {
   return await pipeline(
      User,
      repoQuery(schema, "getAll"),
      "Users retrieved successfully"
   );
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
   let result = null;

   // get user by id or name and email
   if (id) {
      result = await getUserById(id, schema);
   } else if (!result && name && email) {
      result = await getUserByNameAndEmail({ name, email, schema });
   } else {
      throw new ValidationError("User ID or name and email are required.");
   }

   // login logic
   if (password) {
      if (
         !result.data.password ||
         !hashing.same(password, result.data.password)
      ) {
         throw new ValidationError("password is incorrect.");
      }
   }

   // remove password from response
   if (!returnPwd) {
      return UserOperations.removePassword(result.data);
   }

   return result;
}

/**
 * Read user by id
 * @param {string} id - User ID
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with user or error
 *   - message
 *   - data
 *     - user
 *     - schema
 */
export async function getUserById(id, schema) {
   return await pipeline(
      User,
      repoQuery(schema, "getById"),
      "User retrieved successfully",
      id
   );
}

/**
 * Read user by name and email
 * @param {Object} params - Parameters object
 */
export async function getUserByNameAndEmail({ name, email, schema }) {
   return await pipeline(
      User, // Pass the User model class
      repoQuery(schema, "getByNameAndEmail"),
      "User retrieved successfully",
      name,
      email
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
