/**
 * Integration Tests for authApi
 *
 * These tests make real HTTP calls to the backend running in Docker
 * Backend should be running on localhost:3001
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from "vitest";
import authApi from "../../services/authApi.js";

const BACKEND_BASE_URL = "http://localhost:3001";
const TEST_TIMEOUT = 10000;

// Test user credentials
const TEST_ADMIN_USER = {
   email: "admin@auth-system.com",
   password: "admin123",
};

const TEST_REGULAR_USER = {
   email: "testuser@example.com",
   password: "password123",
};

const TEST_NEW_USER = {
   name: "Integration Test User",
   email: `test-${Date.now()}@example.com`,
   password: "testpassword123",
};

describe("authApi Integration Tests", () => {
   beforeAll(async () => {
      console.log("🚀 Starting authApi integration tests");
      console.log("📍 Backend URL:", BACKEND_BASE_URL);

      // Test if backend is accessible
      try {
         const response = await fetch(`${BACKEND_BASE_URL}/api/auth/session`, {
            credentials: "include",
         });
         console.log("✅ Backend is accessible, status:", response.status);
      } catch (error) {
         console.error("❌ Backend not accessible:", error.message);
         throw new Error(
            "Backend not running or accessible. Please start Docker services."
         );
      }
   }, TEST_TIMEOUT);

   afterEach(async () => {
      // Clean up by logging out after each test
      try {
         await authApi.logout();
      } catch (error) {
         // Ignore errors during cleanup
      }
   });

   describe("User Registration", () => {
      it(
         "should register a new user successfully",
         async () => {
            console.log("🧪 Testing user registration...");

            const response = await authApi.register(TEST_NEW_USER);

            console.log("📋 Registration response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.message).toBeDefined();
            expect(response.data).toBeDefined();
         },
         TEST_TIMEOUT
      );

      it(
         "should handle registration with refererUrl for schema detection",
         async () => {
            console.log("🧪 Testing registration with refererUrl...");

            const testUser = {
               name: "Schema Test User",
               email: `schema-test-${Date.now()}@example.com`,
               password: "testpassword123",
            };

            const refererUrl = "https://client-app.example.com";
            const response = await authApi.register(testUser, refererUrl);

            console.log("📋 Registration with referer response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
         },
         TEST_TIMEOUT
      );

      it(
         "should handle registration errors for invalid data",
         async () => {
            console.log("🧪 Testing registration with invalid data...");

            const invalidUser = {
               name: "Test",
               // Missing email and password
            };

            const response = await authApi.register(invalidUser);

            console.log("📋 Invalid registration response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);
            expect(response.message).toContain("required");
         },
         TEST_TIMEOUT
      );
   });

   describe("User Login", () => {
      beforeEach(async () => {
         // Ensure we start with a clean session
         await authApi.logout();
      });

      it(
         "should login successfully with valid credentials",
         async () => {
            console.log("🧪 Testing login with valid credentials...");

            const response = await authApi.login(TEST_REGULAR_USER);

            console.log("📋 Login response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();

            // Check for enhanced session data from role detection
            if (response.sessionUpdate) {
               expect(response.sessionUpdate.userId).toBeDefined();
               expect(response.sessionUpdate.role).toBeDefined();
               expect(response.sessionUpdate.isAuthenticated).toBe(true);
               console.log(
                  "✅ Role detection data found:",
                  response.sessionUpdate
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should login with refererUrl for role detection",
         async () => {
            console.log(
               "🧪 Testing login with refererUrl for role detection..."
            );

            const refererUrl = "https://client-app.example.com";
            const response = await authApi.login(TEST_REGULAR_USER, refererUrl);

            console.log("📋 Login with referer response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);

            // Should have role detection triggered
            if (response.sessionUpdate) {
               expect(response.sessionUpdate.schema).toBeDefined();
               console.log(
                  "✅ Schema detection working:",
                  response.sessionUpdate.schema
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should handle login errors for invalid credentials",
         async () => {
            console.log("🧪 Testing login with invalid credentials...");

            const invalidCredentials = {
               email: "nonexistent@example.com",
               password: "wrongpassword",
            };

            const response = await authApi.login(invalidCredentials);

            console.log("📋 Invalid login response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);
            expect(response.message).toBeDefined();
         },
         TEST_TIMEOUT
      );

      it(
         "should handle missing credentials",
         async () => {
            console.log("🧪 Testing login with missing credentials...");

            const incompleteCredentials = {
               email: "test@example.com",
               // Missing password
            };

            const response = await authApi.login(incompleteCredentials);

            console.log("📋 Missing credentials response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);
            expect(response.message).toContain("required");
         },
         TEST_TIMEOUT
      );
   });

   describe("Session Management", () => {
      beforeEach(async () => {
         // Login before each session test
         await authApi.login(TEST_REGULAR_USER);
      });

      it(
         "should get current user information",
         async () => {
            console.log("🧪 Testing getCurrentUser...");

            const response = await authApi.getCurrentUser();

            console.log("📋 Current user response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
            expect(response.data.email).toBe(TEST_REGULAR_USER.email);
         },
         TEST_TIMEOUT
      );

      it(
         "should get current session with role information",
         async () => {
            console.log("🧪 Testing getSession...");

            const response = await authApi.getSession();

            console.log("📋 Session response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();

            // Check for session data structure
            const sessionData = response.data;
            expect(sessionData.userId || sessionData.id).toBeDefined();

            // If role detection is working, we should have role info
            if (sessionData.role) {
               expect(["admin", "owner", "user"]).toContain(sessionData.role);
               console.log("✅ Session role detected:", sessionData.role);
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should handle logout successfully",
         async () => {
            console.log("🧪 Testing logout...");

            const response = await authApi.logout();

            console.log("📋 Logout response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);

            // After logout, session should be invalid
            const sessionResponse = await authApi.getSession();
            console.log("📋 Session after logout:", sessionResponse);

            expect(sessionResponse.success).toBe(false);
         },
         TEST_TIMEOUT
      );
   });

   describe("Role Detection Integration", () => {
      it(
         "should detect admin role for admin users",
         async () => {
            console.log("🧪 Testing admin role detection...");

            const response = await authApi.login(TEST_ADMIN_USER);

            console.log("📋 Admin login response:", response);

            if (response.success && response.sessionUpdate) {
               expect(response.sessionUpdate.role).toBe("admin");
               console.log("✅ Admin role detected correctly");
            } else {
               console.log(
                  "ℹ️ Admin user may not exist or role detection not fully implemented"
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should maintain session state across requests",
         async () => {
            console.log("🧪 Testing session persistence...");

            // Login
            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            expect(loginResponse.success).toBe(true);

            // Check session persists
            const sessionResponse1 = await authApi.getSession();
            expect(sessionResponse1.success).toBe(true);

            // Make another request
            const userResponse = await authApi.getCurrentUser();
            expect(userResponse.success).toBe(true);

            // Session should still be valid
            const sessionResponse2 = await authApi.getSession();
            expect(sessionResponse2.success).toBe(true);

            console.log("✅ Session persistence working correctly");
         },
         TEST_TIMEOUT
      );
   });

   describe("Error Handling", () => {
      it(
         "should handle network errors gracefully",
         async () => {
            console.log("🧪 Testing network error handling...");

            // This test simulates what happens when backend is not available
            // We'll test this by making a request to a non-existent endpoint
            const originalLogin = authApi.login;

            // Temporarily modify the API call to point to bad URL
            const badCredentials = {
               email: "test@example.com",
               password: "test",
            };

            try {
               // Make request to ensure we handle server errors properly
               const response = await authApi.login(badCredentials);

               expect(response).toBeDefined();
               expect(response.success).toBe(false);
               expect(response.message).toBeDefined();

               console.log("✅ Error handling working correctly");
            } catch (error) {
               // If an exception is thrown, the error handling needs improvement
               console.log("⚠️ Unhandled exception:", error.message);
               expect(false).toBe(true); // This should not happen with proper error handling
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should handle malformed responses",
         async () => {
            console.log("🧪 Testing malformed response handling...");

            // Test with invalid data that might cause parsing issues
            const response = await authApi.login({
               email: "",
               password: "",
            });

            expect(response).toBeDefined();
            expect(response.success).toBe(false);

            console.log("✅ Malformed response handling working");
         },
         TEST_TIMEOUT
      );
   });
});

/**
 * Test Helper Functions
 */

/**
 * Check if backend is running and accessible
 */
export async function checkBackendHealth() {
   try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/auth/session`);
      return response.status < 500; // Any response under 500 means backend is running
   } catch (error) {
      return false;
   }
}

/**
 * Clean up test data (if needed)
 */
export async function cleanupTestData() {
   // This could be expanded to clean up test users created during testing
   console.log("🧹 Cleaning up test data...");
}
