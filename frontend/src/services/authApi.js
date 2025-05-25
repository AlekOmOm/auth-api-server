import { fetchGet, fetchPost } from "../util/fetch";
import { authStore } from "../stores/authStore";

const BACKEND_URL =
   import.meta.env.VITE_BACKEND_URL || "http://localhost:3003/api";

const BACKEND_URL_AUTH = `${BACKEND_URL}/auth`;

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

      // --- Added: Update authStore on successful registration ---
      if (response.data && response.data.userId) {
         // Registration successful, but don't auto-login - let user login manually
         // console.log("Registration successful for user:", response.data.userId);
      } else {
         console.warn(
            "Registration successful, but user data missing in response."
         );
      }
      // Return the successful response object
      return response;
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
 * @param {Object} credentials - User credentials with email and password (name removed)
 * @returns {Promise<Object>} Login result with success status
 * - invalid input (credentials):
 *    {
 *       message: ...,
 *       success: false,
 *    }
 * - sucess:
 *    {
 *       data: {
 *          ... // user data
 *          allowedUrls: [...],
 *       },
 *       message: ...,
 *       errors: ...,
 *    }
 * - failure:
 *    {
 *       message: ...,
 *       success: false,
 *    }
 */
const login = async (credentials, returnUrl = null) => {
   try {
      // validation
      if (!credentials.email || !credentials.password) {
         return {
            message: "Email and password are required",
            success: false,
         };
      }
      /**
       * sends Post request to /login
       *
       * req:
       *   {
       *     body: {
       *       credentials: { email, password },
       *       returnUrl: ...
       *     }
       *   }
       */
      const response = await fetchPost(`${BACKEND_URL_AUTH}/login`, {
         credentials,
         returnUrl,
      });

      if (!response.success) {
         return {
            ...response,
            success: false,
         };
      }

      // success
      return {
         ...response,
         success: true,
      };
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
   register,
   login,
   logout,
};

export default authApi;
