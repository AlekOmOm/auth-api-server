import { get, writable } from "svelte/store";
import { fetchGet } from "../util/fetch";
import authApi from "../services/authApi"; // Import authApi

const BACKEND_URL =
   import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";
const BACKEND_URL_AUTH = `${BACKEND_URL}/auth`;

/** AuthStore
 * - client-side authentication state
 * - utilizes service: authApi.js
 *
 * @docs [authorization](https://github.com/AlekOmOm/auth-api-server/tree/main/docs/core-components/client-app-authorization.md)
 *
 * @exports:
 * - login
 * - register
 * - logout
 * - checkAuth
 * - checkSession
 * - checkReferer
 */
function createAuthStore() {
   /**
    * - isAuthenticated: boolean
    * - session: {Object}
    * - url: string
    *   - url for identification of Schema ()
    * - loading: boolean
    */
   const { subscribe, set, update } = writable({
      isAuthenticated: false,
      session: null,
      refererUrl: null,
      loading: true,
   });

   // ------------- login, register, logout logic -------------
   /**
    * login
    * @description Authenticates user via API and updates store state
    * @param {Object} credentials - User credentials
    * @returns {Promise<Object>} API response
    */
   async function login(credentials) {
      update((state) => ({ ...state, loading: true }));
      const url = extractRefererHeader();

      try {
         const response = await authApi.login(credentials, url);

         setStore(response, response.success, url, set);
         return response;
      } catch (error) {
         set({
            isAuthenticated: false,
            session: null,
            refererUrl: null,
            loading: false,
         });
         return {
            message: error.message || "Login failed in store",
            success: false,
         };
      }
   }

   /**
    * register
    * @description Registers a new user via API
    * @param {Object} credentials - User credentials
    * @returns {Promise<Object>} API response
    */
   async function register(credentials) {
      update((state) => ({ ...state, loading: true }));
      const url = extractRefererHeader();
      try {
         const response = await authApi.register(credentials);
         update((state) => ({ ...state, loading: false }));
         return response;
      } catch (error) {
         console.error("authStore register error:", error);
         update((state) => ({ ...state, loading: false }));
         return {
            message: error.message || "Registration failed in store",
            success: false,
         };
      }
   }

   /**
    * logout
    * @description Logs out user via API and updates store state
    * @returns {Promise<Object>} API response
    */
   async function logout() {
      update((state) => ({ ...state, loading: true }));
      try {
         const response = await authApi.logout();
         setStore(response, false, null, set);
         return response;
      } catch (error) {
         console.error("authStore logout error:", error);
         setStore(null, true, null, set);
         return {
            message: error.message || "Logout failed in store",
            success: false,
         };
      }
   }

   // ------------- check logic -------------

   /**
    * checkAuth
    * @returns {Promise<Object>} API response
    * - {
    *    isAuthenticated: boolean,
    *    session: {Object}
    *    loading: boolean
    * }
    */
   async function checkAuth() {
      const { isAuthenticated, session, loading } = get(authStore);
      if (!isAuthenticated) {
         checkSession();
      }
      return { isAuthenticated, session, loading };
   }

   /** checkSession
    * @description check if user is authenticated
    * @context utilizes service: authApi.js
    * @docs [authorization](https://github.com/auth-system/auth-system-docs/blob/main/docs/core-components/client-app-authorization.md)
    * @returns {Promise<Object>} API response
    */
   async function checkSession() {
      update((state) => ({ ...state, loading: true }));
      try {
         const res = await fetchGet(`${BACKEND_URL_AUTH}/session`, {}); // Pass empty options object
         // res is the direct JSON from backend.
         // For fetchGet, success is implied if no error is thrown.
         // Authentication is confirmed if res.data, res.data.user, and res.data.user.id exist.
         setStore(
            res,
            res.data && res.data.user && res.data.user.id != null,
            null,
            set
         );
      } catch (error) {
         // If checkSession fails (e.g., network error or API error from fetchGet), user is not authenticated.
         setStore(null, false, null, set);
      }
   }

   // Check session when store is initialized (with small delay to avoid race conditions)
   setTimeout(() => {
      checkSession();
   }, 100);

   return {
      subscribe,
      set,
      //
      login,
      register,
      logout,
      // check
      checkAuth,
      checkSession,
   };
}

// ------------- helper functions -------------

function setStore(response, check = true, url = null, set) {
   const { data } = response || {}; // Destructure data directly, remove sessionUpdate

   if (check && data) {
      // Session data is now directly from response.data (expected to be User schema)
      set({
         isAuthenticated: true, // Determined by the 'check' parameter
         session: data, // Store the User object
         refererUrl: url, // The URL used for login context
         loading: false,
      });
   } else {
      set({
         isAuthenticated: false,
         session: null,
         refererUrl: url,
         loading: false,
      });
   }
}

/**
 * Extract referer header from the Client App redirection
 * @returns {string} referer header
 */
export function extractRefererHeader() {
   const referer = document.referrer;
   return referer;
}

export const authStore = createAuthStore();
