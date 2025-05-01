// --- services ---
import * as userService from "../services/userService.js";

// --- User Controller ---

/**
 * @description Get all users (admin)
 * Calls userService.getUsers
 */
const getAllUsers = async (req, res, next) => {
  try {
    // No specific input needed from req for getting all users
    const result = await userService.getUsers();
    res.status(200).json(result);
  } catch (error) {
    next(error); // Pass error to global error handler
  }
};

/**
 * @description Get a single user by ID (admin)
 * Calls userService.getUserById
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
    const result = await userService.getUserById(userId);
    // Assuming service returns null/undefined or throws if not found handled by error handler
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * @description Update a user by ID (admin)
 * Calls userService.updateUser
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
    // Add the id to the userData object for the service/repository
    userData.id = userId;
    const result = await userService.updateUser(userData);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Add createUser and deleteUser similarly if needed

// --- export ---
export { getAllUsers, getUserById, updateUser };
