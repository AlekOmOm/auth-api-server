import repo from "../repo/userRepository.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";

// ---- utils ----
import { removePasswordFromUser } from "../utils/authUtils.js";

// ---- service ----

// Read all users
export async function getUsers(schema) {
   try {
      const users = await repo.getUsers(schema);

      // Filter sensitive data
      const filteredUsers = users.map((user) => removePasswordFromUser(user));

      return {
         message: "Users retrieved successfully",
         data: {
            users: filteredUsers,
         },
      };
   } catch (error) {
      throw error;
   }
}

// Read user by id
export async function getUserById(id, schema) {
   try {
      if (!id) {
         throw new ValidationError("User ID is required");
      }

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

// Read user by email
export async function getUserByNameAndEmail(name, email, schema) {
   try {
      if (!name || !email) {
         throw new ValidationError("Name and email are required");
      }

      const user = await repo.getUserByNameAndEmail(schema, name, email);

      if (!user) {
         throw new NotFoundError("User not found");
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

// Create user
export async function createUser(user, schema) {
   try {
      if (!user || !user.name || !user.email || !user.password) {
         throw new ValidationError("Name, email, and password are required");
      }

      // Set default role if not provided
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

// Update user
export async function updateUser(id, userData, schema) {
   try {
      if (!id) {
         throw new ValidationError("User ID is required");
      }

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

// Delete user
export async function deleteUser(id, schema) {
   try {
      if (!id) {
         throw new ValidationError("User ID is required");
      }

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
   getUsers,
   getUserById,
   getUserByNameAndEmail,
   createUser,
   updateUser,
   deleteUser,
};

export default userService;
