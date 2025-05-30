import { userRepo as userAuthInternalRepo } from "../repo/repositories/userRepository.js";
import { userRepo as userClientAppRepo } from "../repo/clientAppRepository.js"; // For client app tenant operations
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import hashing from "../utils/hashing.js";

// ---- utils ----
import { removePasswordFromUser } from "../utils/authUtils.js";

// ---- Helper to get the correct repository based on schema ----
function getRepo(schema) {
   if (schema === "auth_internal") {
      return userAuthInternalRepo;
   } else {
      return userClientAppRepo;
   }
}

// ---- service ----

/**
 * Read all users
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with users or error
 */
export async function getUsers(schema) {
   try {
      const repo = getRepo(schema);
      const users = await repo.getUsers(schema);

      return {
         message: "Users retrieved successfully",
         data: {
            users: users.map((user) => removePasswordFromUser(user)),
         },
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Get user by id or by name and email
 * @param {Object} params - Parameters object
 * @param {string} params.id - User ID (optional)
 * @param {string} params.name - User name (optional)
 * @param {string} params.email - User email (optional)
 * @param {string} params.schema - The database schema
 * @param {boolean} params.forLogin - Whether this is for login (optional)
 * @param {string} params.password - Password for login verification (optional)
 * @returns {Object} User data
 */
export async function getUser({
   id,
   name,
   email,
   schema,
   forLogin = false,
   password = null,
}) {
   try {
      if (id) {
         const res = await getUserById(id, schema);
         if (res.data) {
            return res;
         }
      }

      if (name && email) {
         return await getUserByNameAndEmail({
            name,
            email,
            schema,
            forLogin,
            password,
         });
      }

      throw new ValidationError("User ID or name and email are required");
   } catch (error) {
      throw error;
   }
}

/**
 * Read user by id
 * @param {string} id - User ID
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with user data or error
 */
export async function getUserById(id, schema) {
   try {
      if (!id) {
         throw new ValidationError("User ID is required");
      }
      const repo = getRepo(schema);
      const user = await repo.getUser(schema, id);

      if (!user) {
         throw new NotFoundError(`User with ID ${id} not found`);
      }

      // Filter sensitive data
      const filteredUser = removePasswordFromUser(user);

      return {
         message: "User retrieved successfully",
         data: filteredUser,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Read user by name and email
 * @param {Object} params - Parameters object
 * @param {string} params.name - User's name
 * @param {string} params.email - User's email
 * @param {string} params.schema - The database schema
 * @param {boolean} params.forLogin - Whether this is for login (default: false)
 * @param {string} params.password - Password for login verification (optional)
 * @returns {Promise<Object>} Formatted response with user data or error
 */
export async function getUserByNameAndEmail({
   name,
   email,
   schema,
   forLogin = false,
   password = null,
}) {
   try {
      if (!name || !email) {
         throw new ValidationError("Name and email are required");
      }
      const repo = getRepo(schema);
      let user = await repo.getUserByNameAndEmail(schema, name, email);

      if (!user) {
         throw new NotFoundError("User not found");
      }

      if (forLogin && !hashing.same(password, user.password)) {
         throw new ValidationError("Invalid password");
      }
      return {
         message: "User retrieved successfully",
         data: removePasswordFromUser(user),
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Create user
 * @param {Object} user - User data (name, email, password, role?)
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with created user data or error
 */
export async function createUser(user, schema) {
   try {
      if (!user || !user.name || !user.email || !user.password) {
         throw new ValidationError("Name, email, and password are required");
      }
      const repo = getRepo(schema);

      const userWithRole = {
         ...user,
         role: user.role || "user",
      };

      const result = await repo.createUser(schema, [
         userWithRole.name,
         userWithRole.role,
         userWithRole.email,
         userWithRole.password,
      ]);

      // Filter sensitive data
      const newUser = {
         id: result.lastID,
         name: userWithRole.name,
         role: userWithRole.role,
         email: userWithRole.email,
      };

      return {
         message: "User created successfully",
         data: newUser,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Update user
 * @param {string} id - User ID
 * @param {Object} userData - Fields to update
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted response with updated user data or error
 */
export async function updateUser(id, userData, schema) {
   try {
      if (!id) {
         throw new ValidationError("User ID is required");
      }
      const repo = getRepo(schema);

      // Get existing user
      const existingUser = await repo.getUser(schema, id);

      if (!existingUser) {
         throw new NotFoundError(`User with ID ${id} not found`);
      }

      // Update only provided fields
      const updatedUser = {
         name: userData.name || existingUser.name,
         role: userData.role || existingUser.role,
         email: userData.email || existingUser.email,
         password: userData.password || existingUser.password,
      };

      await repo.updateUser(schema, [
         updatedUser.name,
         updatedUser.role,
         updatedUser.email,
         updatedUser.password,
         id,
      ]);

      // Filter sensitive data
      const filteredUser = removePasswordFromUser({
         id,
         ...updatedUser,
      });

      return {
         message: "User updated successfully",
         data: filteredUser,
      };
   } catch (error) {
      throw error;
   }
}

/**
 * Delete user
 * @param {string} id - User ID
 * @param {string} schema - The database schema
 * @returns {Promise<Object>} Formatted success response or error
 */
export async function deleteUser(id, schema) {
   try {
      if (!id) {
         throw new ValidationError("User ID is required");
      }
      const repo = getRepo(schema);
      const user = await repo.getUser(schema, id);

      if (!user) {
         throw new NotFoundError(`User with ID ${id} not found`);
      }

      await repo.deleteUser(schema, id);

      return {
         message: "User deleted successfully",
      };
   } catch (error) {
      throw error;
   }
}

const userService = {
   getUser,
   getUsers,
   getUserById,
   getUserByNameAndEmail,
   createUser,
   updateUser,
   deleteUser,
};

export default userService;
