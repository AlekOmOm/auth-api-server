import { fetchGet, fetchPost } from "../util/fetch";

const BACKEND_URL_AUTH = "/api/auth"; // vite proxy

/**
 * Register a new user
 * @param {Object} credentials - User credentials with username and password
 * @param {string} [refererUrl] - effective URL for schema identification
 * @returns {Promise<Object>} Registration result with success status
 */
const register = async (credentials, refererUrl = null) => {
   try {
      // Input validation
      if (!credentials.name || !credentials.email || !credentials.password) {
         return {
            message: "Name, email and password are required",
            success: false,
         };
      }

      const response = await fetchPost(`${BACKEND_URL_AUTH}/register`, {
         credentials,
         refererUrl,
      });

      if (!response.data) {
         return {
            message: "Registration failed",
            success: false,
         };
      }

      return response;
   } catch (error) {
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
   console.log("🔍 [AUTH API] login function called");
   console.log("🔍 [AUTH API] credentials:", {
      email: credentials.email,
      passwordLength: credentials.password?.length,
   });
   console.log("🔍 [AUTH API] returnUrl:", returnUrl);
   console.log("🔍 [AUTH API] BACKEND_URL_AUTH:", BACKEND_URL_AUTH);

   try {
      // validation
      if (!credentials.email || !credentials.password) {
         console.log(
            "🔍 [AUTH API] Validation failed - missing email or password"
         );
         return {
            message: "Email and password are required",
            success: false,
         };
      }

      console.log("🔍 [AUTH API] Validation passed, preparing request body");

      const requestBody = {
         credentials,
         returnUrl,
      };

      console.log("🔍 [AUTH API] Request body:", requestBody);
      console.log(
         "🔍 [AUTH API] About to call fetchPost to:",
         `${BACKEND_URL_AUTH}/login`
      );

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
      const response = await fetchPost(
         `${BACKEND_URL_AUTH}/login`,
         requestBody
      );

      console.log("🔍 [AUTH API] fetchPost response:", response);

      if (!response.success) {
         console.log("🔍 [AUTH API] Login failed, returning error response");
         return {
            ...response,
            success: false,
         };
      }

      // success
      console.log("🔍 [AUTH API] Login successful, returning success response");
      return {
         ...response,
         success: true,
      };
   } catch (error) {
      console.error("🔍 [AUTH API] Login error:", error);
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

      if (response.success) {
         return {
            ...response,
            success: true,
         };
      } else {
         console.error("Backend logout failed:", response);
         return {
            ...response,
            success: false,
         };
      }
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
