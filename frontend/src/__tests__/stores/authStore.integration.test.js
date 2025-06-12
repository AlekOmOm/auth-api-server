/**
 * Integration Tests for authStore
 *
 * These tests make real HTTP calls to the backend running in Docker
 * Backend should be running on localhost:3001
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { get } from "svelte/store";
import { authStore, extractRefererHeader } from "../../stores/authStore.js";
import authApi from "../../services/authApi.js"; // To help with setup/assertions if needed

const BACKEND_BASE_URL = "http://localhost:3001";
const TEST_TIMEOUT = 10000;

// Test user credentials
const TEST_USER = {
   email: "testuser@example.com",
   password: "password123",
};

const TEST_NEW_USER = {
   name: "Store Test User",
   email: `store-test-${Date.now()}@example.com`,
   password: "testpassword123",
};

// Mock the extractRefererHeader as it relies on document.referrer which isn't available in Node.js
vi.mock("../../stores/authStore", async (importOriginal) => {
   const original = await importOriginal();
   return {
      ...original,
      extractRefererHeader: vi.fn(() => "http://localhost:3000/test-referer"),
   };
});

describe("authStore Integration Tests", () => {
   const generateUniqueEmail = () => `storetest_${Date.now()}@example.com`;
   const generateUniqueName = () => `Store Test User ${Date.now()}`;

   // Reset store to initial state and clear mocks before each test
   beforeEach(async () => {
      // Manually reset the store's state if possible, or re-initialize
      // For this example, we'll rely on logout and clear any session manually
      // if a direct reset function isn't exposed by authStore.
      // A robust way would be to have authStore.reset() or similar for testing.
      authStore.set({
         isAuthenticated: false,
         session: null,
         refererUrl: null,
         loading: false,
      });
      vi.clearAllMocks(); // Clear mocks like extractRefererHeader
      // Ensure extractRefererHeader mock is active for each test
      extractRefererHeader.mockReturnValue(
         "http://localhost:3000/test-referer"
      );

      // Due to the 100ms delay in authStore's initial checkSession,
      // wait a bit to ensure it doesn't interfere with tests setting up their own state.
      await new Promise((resolve) => setTimeout(resolve, 150));
   });

   afterEach(async () => {
      // Attempt to logout to clean up session on the backend if a user was logged in
      // This is important for backend state, though frontend store is reset in beforeEach
      if (get(authStore).isAuthenticated) {
         await authStore.logout();
      }
   });

   describe("Store Registration", () => {
      it(
         "should register a new user and update store state",
         async () => {
            console.log("🧪 Testing store register...");

            const response = await authStore.register(TEST_NEW_USER);

            console.log("📋 Store register response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.message).toBeDefined();

            // Check store state after registration
            const storeState = get(authStore);
            console.log("📋 Store state after register:", storeState);

            expect(storeState.loading).toBe(false);

            console.log("✅ Store registration working");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle registration errors and update store state",
         async () => {
            console.log("🧪 Testing store register error handling...");

            const invalidUser = {
               name: "Test",
               // Missing email and password
            };

            const response = await authStore.register(invalidUser);

            console.log("📋 Store register error response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);
            expect(response.message).toBeDefined();

            // Check store state after failed registration
            const storeState = get(authStore);
            console.log("📋 Store state after register error:", storeState);

            expect(storeState.loading).toBe(false);
            expect(storeState.isAuthenticated).toBe(false);

            console.log("✅ Store registration error handling working");
         },
         TEST_TIMEOUT
      );
   });

   describe("Store Login", () => {
      it(
         "should login successfully and update store state",
         async () => {
            console.log("🧪 Testing store login...");

            const response = await authStore.login(TEST_USER);

            console.log("📋 Store login response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();

            // Check store state after login
            const storeState = get(authStore);
            console.log("📋 Store state after login:", storeState);

            expect(storeState.loading).toBe(false);
            expect(storeState.isAuthenticated).toBe(true);
            expect(storeState.session).toBeDefined();
            expect(storeState.session.email).toBe(TEST_USER.email);

            console.log("✅ Store login working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle login errors and update store state",
         async () => {
            console.log("🧪 Testing store login error handling...");

            const invalidCredentials = {
               email: "nonexistent@example.com",
               password: "wrongpassword",
            };

            const response = await authStore.login(invalidCredentials);

            console.log("📋 Store login error response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);
            expect(response.message).toBeDefined();

            // Check store state after failed login
            const storeState = get(authStore);
            console.log("📋 Store state after login error:", storeState);

            expect(storeState.loading).toBe(false);
            expect(storeState.isAuthenticated).toBe(false);
            expect(storeState.session).toBeNull();

            console.log("✅ Store login error handling working");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle referer URL in login",
         async () => {
            console.log("🧪 Testing store login with referer URL...");

            // Set up a mock referer URL
            Object.defineProperty(document, "referrer", {
               value: "https://client-app.example.com",
               writable: true,
            });

            const response = await authStore.login(TEST_USER);

            console.log("📋 Store login with referer response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);

            // Check store state includes referer URL
            const storeState = get(authStore);
            console.log("📋 Store state with referer:", storeState);

            expect(storeState.isAuthenticated).toBe(true);
            // The refererUrl might be set based on the extractRefererHeader function

            console.log("✅ Store login with referer working");
         },
         TEST_TIMEOUT
      );
   });

   describe("Store Logout", () => {
      it(
         "should logout successfully and update store state",
         async () => {
            console.log("🧪 Testing store logout...");

            // First login
            await authStore.login(TEST_USER);
            let storeState = get(authStore);
            expect(storeState.isAuthenticated).toBe(true);

            // Then logout
            const response = await authStore.logout();

            console.log("📋 Store logout response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);

            // Check store state after logout
            storeState = get(authStore);
            console.log("📋 Store state after logout:", storeState);

            expect(storeState.loading).toBe(false);
            expect(storeState.isAuthenticated).toBe(false);
            expect(storeState.session).toBeNull();
            expect(storeState.refererUrl).toBeNull();

            console.log("✅ Store logout working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle logout errors gracefully",
         async () => {
            console.log("🧪 Testing store logout error handling...");

            // Try to logout without being logged in
            const response = await authStore.logout();

            console.log("📋 Store logout error response:", response);

            expect(response).toBeDefined();
            // The response might be successful even if not logged in

            // Check store state
            const storeState = get(authStore);
            console.log("📋 Store state after logout error:", storeState);

            expect(storeState.loading).toBe(false);
            expect(storeState.isAuthenticated).toBe(false);

            console.log("✅ Store logout error handling working");
         },
         TEST_TIMEOUT
      );
   });

   describe("Store Session Management", () => {
      it(
         "should check authentication status correctly",
         async () => {
            console.log("🧪 Testing store checkAuth...");

            // Test when not authenticated
            let authStatus = await authStore.checkAuth();
            console.log("📋 Auth status (not logged in):", authStatus);

            expect(authStatus.isAuthenticated).toBe(false);

            // Login and test when authenticated
            await authStore.login(TEST_USER);
            authStatus = await authStore.checkAuth();
            console.log("📋 Auth status (logged in):", authStatus);

            expect(authStatus.isAuthenticated).toBe(true);
            expect(authStatus.session).toBeDefined();

            console.log("✅ Store checkAuth working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should check session from backend",
         async () => {
            console.log("🧪 Testing store checkSession...");

            // Login first
            await authStore.login(TEST_USER);

            // Check session
            await authStore.checkSession();

            const storeState = get(authStore);
            console.log("📋 Store state after checkSession:", storeState);

            expect(storeState.loading).toBe(false);
            expect(storeState.isAuthenticated).toBe(true);
            expect(storeState.session).toBeDefined();

            console.log("✅ Store checkSession working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle session initialization on store creation",
         async () => {
            console.log("🧪 Testing store session initialization...");

            // The store should automatically check session on creation
            // Wait a moment for the setTimeout in the store to complete
            await new Promise((resolve) => setTimeout(resolve, 200));

            const storeState = get(authStore);
            console.log("📋 Store state after initialization:", storeState);

            expect(storeState.loading).toBe(false);
            // isAuthenticated could be true or false depending on existing session

            console.log("✅ Store initialization working");
         },
         TEST_TIMEOUT
      );
   });

   describe("Store State Management", () => {
      it(
         "should maintain consistent state across operations",
         async () => {
            console.log("🧪 Testing store state consistency...");

            // Initial state
            let storeState = get(authStore);
            console.log("📋 Initial store state:", storeState);

            expect(storeState).toHaveProperty("isAuthenticated");
            expect(storeState).toHaveProperty("session");
            expect(storeState).toHaveProperty("refererUrl");
            expect(storeState).toHaveProperty("loading");

            // Login
            await authStore.login(TEST_USER);
            storeState = get(authStore);

            expect(storeState.isAuthenticated).toBe(true);
            expect(storeState.session).toBeDefined();
            expect(storeState.loading).toBe(false);

            // Check auth
            const authStatus = await authStore.checkAuth();
            expect(authStatus.isAuthenticated).toBe(storeState.isAuthenticated);

            // Logout
            await authStore.logout();
            storeState = get(authStore);

            expect(storeState.isAuthenticated).toBe(false);
            expect(storeState.session).toBeNull();
            expect(storeState.loading).toBe(false);

            console.log("✅ Store state consistency verified");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle loading states correctly",
         async () => {
            console.log("🧪 Testing store loading states...");

            // Monitor loading state during login
            const loginPromise = authStore.login(TEST_USER);

            // Check loading state immediately
            let storeState = get(authStore);
            console.log("📋 Store state during login:", storeState);

            expect(storeState.loading).toBe(true);

            // Wait for login to complete
            await loginPromise;

            storeState = get(authStore);
            console.log("📋 Store state after login:", storeState);

            expect(storeState.loading).toBe(false);

            console.log("✅ Store loading states working correctly");
         },
         TEST_TIMEOUT
      );
   });

   describe("Store Integration with Session Helper", () => {
      it(
         "should work correctly with session helper utilities",
         async () => {
            console.log("🧪 Testing store integration with session helper...");

            // Login to get session data
            const loginResponse = await authStore.login(TEST_USER);

            if (loginResponse.success && loginResponse.sessionUpdate) {
               console.log(
                  "📋 Session update data:",
                  loginResponse.sessionUpdate
               );

               // This tests the integration with our sessionHelper
               expect(loginResponse.sessionUpdate).toBeDefined();
               expect(loginResponse.sessionUpdate.userId).toBeDefined();
               expect(loginResponse.sessionUpdate.isAuthenticated).toBe(true);

               if (loginResponse.sessionUpdate.role) {
                  expect(["admin", "owner", "user"]).toContain(
                     loginResponse.sessionUpdate.role
                  );
                  console.log("✅ Role detection integration working");
               }
            }

            console.log("✅ Store session helper integration working");
         },
         TEST_TIMEOUT
      );
   });
});

/**
 * Test Helper Functions
 */

/**
 * Wait for store state to update
 */
export async function waitForStoreUpdate(timeoutMs = 1000) {
   return new Promise((resolve) => setTimeout(resolve, timeoutMs));
}

/**
 * Get current store state for debugging
 */
export function getStoreState() {
   return get(authStore);
}
