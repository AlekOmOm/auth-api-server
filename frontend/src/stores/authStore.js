import { writable } from "svelte/store";
import { fetchGet } from "../util/fetch";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3001/api";
const BACKEND_URL_AUTH = `${BACKEND_URL}/auth`;

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
    loading: true, // Start in loading state
  });

  /** checkSession
   * @description check if user is authenticated
   * @context called from authApi.js, after fetchPost
   */
  async function checkSession() {
    update((state) => ({ ...state, loading: true }));
    try {
      const sessionData = await fetchGet(`${BACKEND_URL_AUTH}/session`);
      if (sessionData && sessionData.user) {
        set({ isAuthenticated: true, user: sessionData.user, loading: false });
      } else {
        set({ isAuthenticated: false, user: null, loading: false });
      }
    } catch (error) {
      console.error("Session check failed:", error);
      set({ isAuthenticated: false, user: null, loading: false });
    }
  }

  /** login
   * @description update store state to authenticated and set user data
   * @context called from authApi.js, after fetchPost
   *
   * @param {Object} userData - user data from login response
   */
  function login(userData) {
    // called from authApi.js, after fetchPost
    set({ isAuthenticated: true, user: userData, loading: false });
  }

  /** logout
   * @description update store state to unauthenticated and set user data to null
   * @context called from authApi.js, after fetchPost
   */
  function logout() {
    // called from authApi.js, after fetchPost
    set({ isAuthenticated: false, user: null, loading: false });
  }

  // Check session when store is initialized
  checkSession();

  return {
    subscribe,
    checkSession,
    login,
    logout,
  };
}

export const authStore = createAuthStore();
