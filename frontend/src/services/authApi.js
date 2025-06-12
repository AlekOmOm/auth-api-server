import { fetchGet, fetchPost } from "../util/fetch";

const BACKEND_URL =
   import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";
const BACKEND_URL_AUTH = `${BACKEND_URL}/auth`;

/**
 * Register a new user
 * @param {Object} credentials - User credentials with name, email, password, and userType
 * @param {string} [refererUrl] - effective URL for schema identification and role detection
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

      // Map userType to role according to backend expectations (owner for auth_internal)
      const role = credentials.userType === "auth" ? "owner" : "user";

      // Send data directly according to OpenAPI spec
      const requestBody = {
         name: credentials.name,
         email: credentials.email,
         password: credentials.password,
         role: role,
      };

      const response = await fetchPost(
         `${BACKEND_URL_AUTH}/register`,
         requestBody
      );

      if (!response.data && !response.success) {
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
 * @param {Object} credentials - User credentials with email and password
 * @param {string} [refererUrl] - URL for schema detection and role assignment
 * @returns {Promise<Object>} Login result with success status and session data
 * - invalid input (credentials):
 *    {
 *       message: ...,
 *       success: false,
 *    }
 * - success:
 *    {
 *       data: {
 *          ... // user data
 *          allowedUrls: [...],
 *       },
 *       sessionUpdate: {
 *          userId: string,
 *          role: 'admin' | 'owner' | 'user',
 *          schema: string,
 *          ownerId?: string,
 *          sessionId: string,
 *          isAuthenticated: boolean,
 *          allowedUrls: string[]
 *       },
 *       message: ...,
 *       success: true,
 *    }
 * - failure:
 *    {
 *       message: ...,
 *       success: false,
 *    }
 */
const login = async (credentials, refererUrl = null) => {
   // console.log("🔍 [AUTH API] login function called");
   // console.log("🔍 [AUTH API] credentials:", {
   //    email: credentials.email,
   //    passwordLength: credentials.password?.length,
   // });
   // console.log("🔍 [AUTH API] refererUrl:", refererUrl);
   // console.log("🔍 [AUTH API] BACKEND_URL_AUTH:", BACKEND_URL_AUTH);

   try {
      // validation
      if (!credentials.email || !credentials.password) {
         // console.log(
         //    "🔍 [AUTH API] Validation failed - missing email or password"
         // );
         return {
            message: "Email and password are required",
            success: false,
         };
      }

      // console.log("🔍 [AUTH API] Validation passed, preparing request body");

      const requestBody = {
         credentials,
         returnUrl: refererUrl,
      };

      // console.log("🔍 [AUTH API] Request body:", requestBody);
      // console.log(
      //    "🔍 [AUTH API] About to call fetchPost to:",
      //    `${BACKEND_URL_AUTH}/login`
      // );

      /**
       * Sends POST request to /login for authentication and role detection
       *
       * Request structure:
       *   {
       *     body: {
       *       credentials: { email, password },
       *       returnUrl: ... // Used for schema detection and role assignment
       *     }
       *   }
       *
       * Response includes enhanced session data from role detection middleware
       */
      const response = await fetchPost(
         `${BACKEND_URL_AUTH}/login`,
         requestBody
      );

      // console.log("🔍 [AUTH API] fetchPost response:", response);

      if (!response.success) {
         // console.log("🔍 [AUTH API] Login failed, returning error response");
         return {
            ...response,
            success: false,
         };
      }

      // success
      // console.log("🔍 [AUTH API] Login successful, returning success response");
      // console.log("🔍 [AUTH API] Session data:", response.sessionUpdate);

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
 * Logout the current user and clean up session
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

/**
 * Get current user information with session details
 * @returns {Promise<Object>} Current user data with role and session info
 */
const getCurrentUser = async () => {
   try {
      const backendResponse = await fetchGet(`${BACKEND_URL_AUTH}/me`);
      // Wrap the backend response to ensure a consistent return structure from the authApi service
      return {
         success: true,
         message: backendResponse.message, // Assuming backend /me returns an ApiResponse-like object
         data: backendResponse.data, // with message and data (User object)
      };
   } catch (error) {
      console.error("Error in getCurrentUser:", error);
      return {
         success: false,
         message: error.message || "Failed to get current user",
         data: null,
      };
   }
};

/**
 * Get current session information including role and context
 * @returns {Promise<Object>} Session data with role, schema, and ownership info
 */
const getSession = async () => {
   try {
      const backendResponse = await fetchGet(`${BACKEND_URL_AUTH}/session`);
      // Wrap the backend response for a consistent API service layer return
      return {
         success: true,
         message: backendResponse.message, // Assuming backend /session returns ApiResponse-like object
         data: backendResponse.data, // with message and data (User object)
      };
   } catch (error) {
      console.error("Error in getSession:", error);
      return {
         success: false,
         message: error.message || "Failed to get session",
         data: null,
      };
   }
};

// --- export ---
const authApi = {
   register,
   login,
   logout,
   getCurrentUser,
   getSession,
};

export default authApi;
