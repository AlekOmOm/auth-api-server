import { get, writable } from "svelte/store";
import { fetchGet } from "../util/fetch";
import authApi from "../services/authApi"; // Import authApi
import { extractRefererHeader } from "../util/refererHeader";

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
 * - checkAuth
 * - checkSession
 * - login
 * - register
 * - logout
 */
function createAuthStore() {
   const { subscribe, set, update } = writable({
      isAuthenticated: false,
      session: null,
      loading: true,
   });

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
         const dataRaw = await fetchGet(`${BACKEND_URL_AUTH}/session`);
         const { message, data } = dataRaw;
         if (data.id) {
            set({
               isAuthenticated: true,
               session: data,
               loading: false,
            });
         } else {
            set({
               isAuthenticated: false,
               session: null,
               loading: false,
            });
         }
      } catch (error) {
         set({ isAuthenticated: false, session: null, loading: false });
      }
   }

   /**
    * login
    * @description Authenticates user via API and updates store state
    * @param {Object} credentials - User credentials
    * @param {string} url - url for identification of Schema
    * @returns {Promise<Object>} API response
    */
   async function login(credentials, url = null) {
      update((state) => ({ ...state, loading: true }));

      try {
         const response = await authApi.login(credentials, url);

         if (
            response.success &&
            response.data &&
            (response.data.userId || response.data.id)
         ) {
            set({
               isAuthenticated: true,
               session: response.data,
               loading: false,
            });
         } else {
            set({ isAuthenticated: false, session: null, loading: false });
         }
         return response;
      } catch (error) {
         set({ isAuthenticated: false, session: null, loading: false });
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
         set({ isAuthenticated: false, session: null, loading: false });
         return response;
      } catch (error) {
         console.error("authStore logout error:", error);
         set({ isAuthenticated: false, session: null, loading: false });
         return {
            message: error.message || "Logout failed in store",
            success: false,
         };
      }
   }

   /**
    * checkReferer
    * @description Checks the referer header for identification of Schema
    * @returns {Promise<Object>} API response
    */
   async function checkReferer() {
      const referer = extractRefererHeader();
      if (referer) {
         const response = await authApi.checkReferer(referer);
         return response;
      }
   }

   // Check session when store is initialized (with small delay to avoid race conditions)
   setTimeout(() => {
      checkSession();
   }, 100);

   return {
      subscribe,
      checkAuth,
      checkSession,
      checkReferer,
      login,
      register,
      logout,
   };
}

export const authStore = createAuthStore();
