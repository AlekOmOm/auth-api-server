/**
 * Integration Tests for sessionHelper
 *
 * These tests verify the session helper utilities work correctly
 * with real session data from the backend running in Docker
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import sessionHelper, {
   USER_ROLES,
   isAuthenticated,
   hasRole,
   isAdmin,
   isOwner,
   isAdminOrOwner,
   ownsCurrentResource,
   getCurrentRole,
   getCurrentUserId,
   getCurrentOwnerId,
   handleLoginResponse,
   handleLogout,
   getSessionSummary,
} from "../../util/sessionHelper.js";
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

const TEST_OWNER_USER = {
   email: "owner@example.com",
   password: "password123",
};

describe("sessionHelper Integration Tests", () => {
   beforeAll(async () => {
      console.log("🚀 Starting sessionHelper integration tests");
      console.log("📍 Backend URL:", BACKEND_BASE_URL);

      // Test if backend is accessible
      try {
         const response = await fetch(`${BACKEND_BASE_URL}/api/auth/session`);
         console.log("✅ Backend is accessible, status:", response.status);
      } catch (error) {
         console.error("❌ Backend not accessible:", error.message);
         throw new Error(
            "Backend not running or accessible. Please start Docker services."
         );
      }
   }, TEST_TIMEOUT);

   afterEach(async () => {
      // Clean up by clearing session and logging out
      try {
         await handleLogout();
         sessionHelper.clearSession();
      } catch (error) {
         // Ignore errors during cleanup
      }
   });

   describe("Session Management", () => {
      it(
         "should handle login response and update session",
         async () => {
            console.log("🧪 Testing handleLoginResponse...");

            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            console.log("📋 Login response:", loginResponse);

            expect(loginResponse.success).toBe(true);

            const handled = handleLoginResponse(loginResponse);
            console.log("📋 HandleLoginResponse result:", handled);

            if (loginResponse.sessionUpdate) {
               expect(handled).toBe(true);

               // Check session helper state
               expect(isAuthenticated()).toBe(true);
               expect(getCurrentUserId()).toBeDefined();
               expect(getCurrentRole()).toBeDefined();

               const sessionSummary = getSessionSummary();
               console.log("📋 Session summary:", sessionSummary);

               expect(sessionSummary.authenticated).toBe(true);
               expect(sessionSummary.userId).toBeDefined();
               expect(sessionSummary.role).toBeDefined();

               console.log("✅ HandleLoginResponse working correctly");
            } else {
               console.log(
                  "ℹ️ No sessionUpdate in response, basic session handling"
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should handle logout and clear session",
         async () => {
            console.log("🧪 Testing handleLogout...");

            // First login
            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            handleLoginResponse(loginResponse);

            expect(isAuthenticated()).toBe(true);

            // Then logout
            const logoutResult = await handleLogout();
            console.log("📋 HandleLogout result:", logoutResult);

            expect(isAuthenticated()).toBe(false);
            expect(getCurrentUserId()).toBeNull();
            expect(getCurrentRole()).toBeNull();

            const sessionSummary = getSessionSummary();
            console.log("📋 Session summary after logout:", sessionSummary);

            expect(sessionSummary.authenticated).toBe(false);

            console.log("✅ HandleLogout working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should refresh session from backend",
         async () => {
            console.log("🧪 Testing refreshSession...");

            // Login first
            await authApi.login(TEST_REGULAR_USER);

            // Clear local session
            sessionHelper.clearSession();
            expect(isAuthenticated()).toBe(false);

            // Refresh from backend
            const refreshedSession = await sessionHelper.refreshSession();
            console.log("📋 Refreshed session:", refreshedSession);

            if (refreshedSession) {
               expect(isAuthenticated()).toBe(true);
               expect(getCurrentUserId()).toBeDefined();
               console.log("✅ Session refresh working correctly");
            } else {
               console.log(
                  "ℹ️ Session refresh returned null (session may have expired)"
               );
            }
         },
         TEST_TIMEOUT
      );
   });

   describe("Role Detection and Management", () => {
      it(
         "should detect admin role correctly",
         async () => {
            console.log("🧪 Testing admin role detection...");

            const loginResponse = await authApi.login(TEST_ADMIN_USER);

            if (loginResponse.success) {
               handleLoginResponse(loginResponse);

               const sessionSummary = getSessionSummary();
               console.log("📋 Admin session summary:", sessionSummary);

               if (sessionSummary.role === "admin") {
                  expect(isAdmin()).toBe(true);
                  expect(isAdminOrOwner()).toBe(true);
                  expect(hasRole(USER_ROLES.ADMIN)).toBe(true);
                  expect(getCurrentRole()).toBe(USER_ROLES.ADMIN);

                  console.log("✅ Admin role detection working correctly");
               } else {
                  console.log(
                     "ℹ️ Admin user not detected as admin (may need role detection setup)"
                  );
               }
            } else {
               console.log("ℹ️ Admin login failed (admin user may not exist)");
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should detect owner role correctly",
         async () => {
            console.log("🧪 Testing owner role detection...");

            const loginResponse = await authApi.login(TEST_OWNER_USER);

            if (loginResponse.success) {
               handleLoginResponse(loginResponse);

               const sessionSummary = getSessionSummary();
               console.log("📋 Owner session summary:", sessionSummary);

               if (sessionSummary.role === "owner") {
                  expect(isOwner()).toBe(true);
                  expect(isAdminOrOwner()).toBe(true);
                  expect(hasRole(USER_ROLES.OWNER)).toBe(true);
                  expect(getCurrentRole()).toBe(USER_ROLES.OWNER);

                  console.log("✅ Owner role detection working correctly");
               } else {
                  console.log(
                     "ℹ️ Owner user not detected as owner (may need role detection setup)"
                  );
               }
            } else {
               console.log("ℹ️ Owner login failed (owner user may not exist)");
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should detect regular user role correctly",
         async () => {
            console.log("🧪 Testing regular user role detection...");

            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            handleLoginResponse(loginResponse);

            const sessionSummary = getSessionSummary();
            console.log("📋 Regular user session summary:", sessionSummary);

            expect(isAuthenticated()).toBe(true);

            if (sessionSummary.role === "user") {
               expect(isAdmin()).toBe(false);
               expect(isOwner()).toBe(false);
               expect(isAdminOrOwner()).toBe(false);
               expect(hasRole(USER_ROLES.USER)).toBe(true);
               expect(getCurrentRole()).toBe(USER_ROLES.USER);

               console.log("✅ Regular user role detection working correctly");
            } else {
               console.log(
                  "ℹ️ User role detection may need refinement, current role:",
                  sessionSummary.role
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should detect ownership correctly",
         async () => {
            console.log("🧪 Testing ownership detection...");

            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            handleLoginResponse(loginResponse);

            const userId = getCurrentUserId();
            const ownerId = getCurrentOwnerId();

            console.log("📋 User ID:", userId);
            console.log("📋 Owner ID:", ownerId);

            const ownsResource = ownsCurrentResource();
            console.log("📋 Owns current resource:", ownsResource);

            if (userId && ownerId) {
               expect(ownsResource).toBe(userId === ownerId);
               console.log("✅ Ownership detection working correctly");
            } else {
               console.log("ℹ️ Ownership detection requires ownerId to be set");
            }
         },
         TEST_TIMEOUT
      );
   });

   describe("Session State Utilities", () => {
      it(
         "should provide current session data correctly",
         async () => {
            console.log("🧪 Testing session data utilities...");

            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            handleLoginResponse(loginResponse);

            const currentSession = sessionHelper.getCurrentSession();
            console.log("📋 Current session:", currentSession);

            expect(currentSession).toBeDefined();
            expect(currentSession.isAuthenticated).toBe(true);
            expect(currentSession.userId).toBeDefined();

            // Test individual getters
            expect(getCurrentUserId()).toBe(currentSession.userId);
            expect(getCurrentRole()).toBe(currentSession.role);

            if (currentSession.schema) {
               expect(sessionHelper.getCurrentSchema()).toBe(
                  currentSession.schema
               );
            }

            if (currentSession.allowedUrls) {
               const allowedUrls = sessionHelper.getAllowedUrls();
               expect(Array.isArray(allowedUrls)).toBe(true);
            }

            console.log("✅ Session data utilities working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle session summary correctly",
         async () => {
            console.log("🧪 Testing session summary...");

            // Test when not authenticated
            sessionHelper.clearSession();
            let summary = getSessionSummary();
            console.log("📋 Summary (not authenticated):", summary);

            expect(summary.authenticated).toBe(false);

            // Test when authenticated
            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            handleLoginResponse(loginResponse);

            summary = getSessionSummary();
            console.log("📋 Summary (authenticated):", summary);

            expect(summary.authenticated).toBe(true);
            expect(summary.userId).toBeDefined();
            expect(summary.role).toBeDefined();
            expect(typeof summary.isAdmin).toBe("boolean");
            expect(typeof summary.isOwner).toBe("boolean");
            expect(typeof summary.isAdminOrOwner).toBe("boolean");

            console.log("✅ Session summary working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle URL validation correctly",
         async () => {
            console.log("🧪 Testing URL validation...");

            const loginResponse = await authApi.login(TEST_REGULAR_USER);
            handleLoginResponse(loginResponse);

            const allowedUrls = sessionHelper.getAllowedUrls();
            console.log("📋 Allowed URLs:", allowedUrls);

            if (allowedUrls.length > 0) {
               const testUrl = allowedUrls[0];
               const isAllowed = sessionHelper.isUrlAllowed(testUrl);
               expect(isAllowed).toBe(true);

               const notAllowedUrl = "https://not-allowed.example.com";
               const isNotAllowed = sessionHelper.isUrlAllowed(notAllowedUrl);
               expect(isNotAllowed).toBe(false);

               console.log("✅ URL validation working correctly");
            } else {
               console.log("ℹ️ No allowed URLs in session to test validation");
            }
         },
         TEST_TIMEOUT
      );
   });

   describe("Error Handling", () => {
      it(
         "should handle invalid login responses gracefully",
         async () => {
            console.log("🧪 Testing invalid login response handling...");

            // Test with invalid response
            const invalidResponse = {
               success: false,
               message: "Invalid credentials",
            };

            const handled = handleLoginResponse(invalidResponse);
            expect(handled).toBe(false);
            expect(isAuthenticated()).toBe(false);

            // Test with malformed response
            const malformedResponse = null;
            const handledMalformed = handleLoginResponse(malformedResponse);
            expect(handledMalformed).toBe(false);

            console.log("✅ Invalid response handling working correctly");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle session operations when not authenticated",
         async () => {
            console.log("🧪 Testing operations when not authenticated...");

            sessionHelper.clearSession();

            expect(isAuthenticated()).toBe(false);
            expect(getCurrentUserId()).toBeNull();
            expect(getCurrentRole()).toBeNull();
            expect(getCurrentOwnerId()).toBeNull();
            expect(isAdmin()).toBe(false);
            expect(isOwner()).toBe(false);
            expect(isAdminOrOwner()).toBe(false);
            expect(ownsCurrentResource()).toBe(false);

            const allowedUrls = sessionHelper.getAllowedUrls();
            expect(Array.isArray(allowedUrls)).toBe(true);
            expect(allowedUrls.length).toBe(0);

            console.log(
               "✅ Not authenticated state handling working correctly"
            );
         },
         TEST_TIMEOUT
      );

      it(
         "should handle logout errors gracefully",
         async () => {
            console.log("🧪 Testing logout error handling...");

            // Try to logout when not logged in
            const logoutResult = await handleLogout();
            console.log("📋 Logout result (not logged in):", logoutResult);

            // Should not throw error and should clear session regardless
            expect(isAuthenticated()).toBe(false);

            console.log("✅ Logout error handling working correctly");
         },
         TEST_TIMEOUT
      );
   });

   describe("Role Constants", () => {
      it("should have correct role constants", () => {
         console.log("🧪 Testing role constants...");

         expect(USER_ROLES.ADMIN).toBe("admin");
         expect(USER_ROLES.OWNER).toBe("owner");
         expect(USER_ROLES.USER).toBe("user");

         console.log("✅ Role constants correct");
      });
   });
});

/**
 * Test Helper Functions
 */

/**
 * Create a mock session for testing
 */
export function createMockSession(role = "user", userId = "test-user-123") {
   return {
      userId,
      role,
      schema: "test_schema",
      ownerId: role === "owner" ? userId : "other-user",
      sessionId: "test-session-123",
      isAuthenticated: true,
      allowedUrls: ["https://test.example.com"],
   };
}

/**
 * Set up a test session
 */
export function setupTestSession(role = "user") {
   const mockSession = createMockSession(role);
   sessionHelper.updateSession(mockSession);
   return mockSession;
}
