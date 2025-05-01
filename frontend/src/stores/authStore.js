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

  /* ex. /api/auth/session response
{
    "message": "User retrieved successfully",
    "data": {
        "id": 1,
        "name": "admin",
        "role": "admin",
        "email": "admin@admin.com"
    }
}
  */

  // check session
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

  function login(userData) {
    // Assuming userData includes { userId, role, etc. } from the login response
    set({ isAuthenticated: true, user: userData, loading: false });
  }

  function logout() {
    // Optionally call a logout endpoint on the backend
    set({ isAuthenticated: false, user: null, loading: false });
    // Add navigation back to login if needed, e.g., navigate('/login');
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
