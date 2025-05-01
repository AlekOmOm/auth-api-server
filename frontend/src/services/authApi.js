import { fetchGet, fetchPost } from "../util/fetch";
import { authStore } from "../stores/authStore";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const BACKEND_URL_AUTH = `${BACKEND_URL}/auth`;
const BACKEND_URL_USERS = `${BACKEND_URL}/users`;

/**
 * Test API connection by fetching users
 * @returns {Promise<Object>} The API response with users
 */
const testApi = async () => {
  try {
    const result = await fetchGet(`${BACKEND_URL_USERS}`);

    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Register a new user
 * @param {Object} credentials - User credentials with username and password
 * @returns {Promise<Object>} Registration result with success status
 */
const register = async (credentials) => {
  try {
    // Input validation
    if (!credentials.name || !credentials.email || !credentials.password) {
      return {
        message: "Name, email and password are required",
        success: false,
      };
    }

    // fetchPost now returns an object like { success: boolean, data: ..., errors: ..., message: ... }
    const response = await fetchPost(
      `${BACKEND_URL_AUTH}/register`,
      credentials
    );

    if (!response.success) {
      return response;
    }

    console.log("Registration successful response from fetchPost:", response);

    // --- Added: Update authStore on successful registration ---
    if (response.data && response.data.user) {
      authStore.login(response.data.user);
    } else {
      // Start of Selection
      console.warn(
        "Registration successful, but user data missing in response."
      );
      // End of Selectio

      // Return the successful response object
      return response;
    }
  } catch (error) {
    // This catch block should now ideally only handle unexpected errors *within this function's logic*,
    // as fetchPost catches its own errors.
    console.error("Unexpected error in authApi.register:", error);
    return {
      message:
        error.message || "An unexpected error occurred during registration",
      success: false,
    };
  }
};

/**
 * Login a user with credentials
 * @param {Object} credentials - User credentials with name, email and password
 * @returns {Promise<Object>} Login result with success status
 */
const login = async (credentials) => {
  console.log("const login called");

  try {
    // Input validation (assuming email/password for login)
    if (!credentials.email || !credentials.password) {
      return {
        message: "Email and password are required",
        success: false,
      };
    }

    const response = await fetchPost(`${BACKEND_URL_AUTH}/login`, credentials);

    // fetchPost returns { success, data, message, errors }
    if (!response.success) {
      // Return the structured error from fetchPost
      return response;
    }

    // --- Added: Update authStore on successful login ---
    // Check if the response indicates success and contains essential user data (like userId)
    if (response.success && response.data && response.data.userId) {
      authStore.login(response.data); // Pass the whole data object
      return {
        ...response, // Keep other potential info from response
        success: true,
      };
    } else if (response.success) {
      // Handle case where login API reports success but essential data (userId) is missing
      console.warn(
        "Login successful, but essential user data (userId) missing in response:",
        response.data
      );
      return {
        ...response, // Keep other potential info from response
        success: false,
        message: "Login successful, but user data is incomplete.", // More specific message
      };
    } else {
      // Handle the case where fetchPost already indicated failure
      return response; // Return the original error response from fetchPost
    }
  } catch (error) {
    console.error("Login error:", error);
    return {
      message: error.message || "Login failed",
      success: false,
    };
  }
};

/**
 * Logout the current user
 * @returns {Promise<Object>} Logout result with success status
 */
const logout = async () => {
  try {
    const response = await fetchPost(`${BACKEND_URL_AUTH}/logout`, {});

    authStore.logout();
    return {
      ...response,
      success: true,
    };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      message: error.message || "Logout failed",
      success: false,
    };
  }
};

// --- export ---
const authApi = {
  testApi,
  register,
  login,
  logout,
};

export default authApi;
