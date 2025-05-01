import db from "../db/repository.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";

// ---- utils ----
import { removePasswordFromUser } from "../utils/authUtils.js";

// ---- service ----

// Read all users
export async function getUsers() {
  try {
    console.log("getUsers");
    const users = await db.getUsers();
    console.log("users", users);

    // Filter sensitive data
    const filteredUsers = users.map((user) => removePasswordFromUser(user));

    console.log("filteredUsers", filteredUsers);
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
export async function getUserById(id) {
  try {
    if (!id) {
      throw new ValidationError("User ID is required");
    }

    const user = await db.getUser(id);

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
export async function getUserByNameAndEmail(name, email) {
  try {
    if (!name || !email) {
      throw new ValidationError("Name and email are required");
    }

    const user = await db.getUserByNameAndEmail(name, email);

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
export async function createUser(user) {
  try {
    if (!user || !user.name || !user.email || !user.password) {
      throw new ValidationError("Name, email, and password are required");
    }

    // Set default role if not provided
    const userWithRole = {
      ...user,
      role: user.role || "user",
    };

    const result = await db.createUser([
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
export async function updateUser(id, userData) {
  try {
    if (!id) {
      throw new ValidationError("User ID is required");
    }

    // Get existing user
    const existingUser = await db.getUser(id);

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

    await db.updateUser([
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
export async function deleteUser(id) {
  try {
    if (!id) {
      throw new ValidationError("User ID is required");
    }

    const user = await db.getUser(id);

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    await db.deleteUser(id);

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
