import { get, writable } from "svelte/store";
import { fetchGet } from "../util/fetch";
import authApi from "../services/authApi"; // Import authApi

const BACKEND_URL =
   import.meta.env.VITE_BACKEND_URL || "http://localhost:3003/api";
const BACKEND_URL_AUTH = `${BACKEND_URL}/auth`;

/** AuthStore
 * - client-side authentication state
 * - utilizes service: authApi.js
 *
 * exports operations:
 * - checkAuth
 * - checkSession
 * - login
 * - register
 * - logout
 */
function createAuthStore() {
   // create store
   /*
    * @param {Object} state - The state of the store
    * @param {Function} subscribe - The subscribe function
    * @param {Function} set - The set function
    * @param {Function} update - The update function
    */
   const { subscribe, set, update } = writable({
      isAuthenticated: false,
      user: null,
      loading: true,
   });

   /**
    * checkAuth
    * @description check if user is authenticated
    * @context within authStore check state
    * @state
    * - {
    *      isAuthenticated: boolean,
    *      user: {
    *         userId: string,
    *         email: string,
    *         name: string,
    *      },
    *      loading: boolean,
    *   }
    */
   async function checkAuth() {
      const { isAuthenticated, user, loading } = get(authStore);
      if (!isAuthenticated) {
         checkSession();
      }
      return { isAuthenticated, user, loading };
   }

   /** checkSession
    * @description check if user is authenticated
    * @context utilizes service: authApi.js
    */
   async function checkSession() {
      update((state) => ({ ...state, loading: true }));
      try {
         const sessionData = await fetchGet(`${BACKEND_URL_AUTH}/session`);
         if (sessionData && sessionData.user) {
            set({
               isAuthenticated: true,
               user: sessionData.user,
               loading: false,
            });
         } else {
            set({ isAuthenticated: false, user: null, loading: false });
         }
      } catch (error) {
         console.error("Session check failed:", error);
         set({ isAuthenticated: false, user: null, loading: false });
      }
   }

   /**
    * login
    * @description Authenticates user via API and updates store state
    * @param {Object} credentials - User credentials
    * @returns {Promise<Object>} API response
    */
   async function login(credentials, returnUrl = null) {
      update((state) => ({ ...state, loading: true }));
      try {
         /**
          * authApi login
          * - response.success = true if login is successful
          * - response.message = error message if login fails
          *
          */
         const response = await authApi.login(credentials, returnUrl);
         if (response.success && response.data && response.data.userId) {
            set({ isAuthenticated: true, user: response.data, loading: false });
         } else {
            // Even if API login technically succeeded but lacked data, treat as not logged in for store
            set({ isAuthenticated: false, user: null, loading: false });
         }
         return response;
      } catch (error) {
         console.error("authStore login error:", error);
         set({ isAuthenticated: false, user: null, loading: false });
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
         set({ isAuthenticated: false, user: null, loading: false });
         return response;
      } catch (error) {
         console.error("authStore logout error:", error);
         set({ isAuthenticated: false, user: null, loading: false });
         return {
            message: error.message || "Logout failed in store",
            success: false,
         };
      }
   }

   // Check session when store is initialized
   checkSession();

   return {
      subscribe,
      checkAuth,
      checkSession,
      login,
      register,
      logout,
   };
}

export const authStore = createAuthStore();
