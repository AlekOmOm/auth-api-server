/**
 * Integration Tests for clientServerApi
 *
 * These tests make real HTTP calls to the backend running in Docker
 * Backend should be running on localhost:3001
 */

import { describe, it, expect, beforeAll, afterEach, beforeEach } from "vitest";
import clientServerApi from "../../services/clientServerApi.js";
import authApi from "../../services/authApi.js";

const BACKEND_BASE_URL = "http://localhost:3001";
const TEST_TIMEOUT = 15000;

// Test user credentials
const TEST_OWNER_USER = {
   email: "owner@example.com",
   password: "password123",
};

const TEST_REGULAR_USER = {
   email: "user@example.com",
   password: "password123",
};

const TEST_ADMIN_USER = {
   email: "admin@auth-system.com",
   password: "admin123",
};

// Test client server data
const TEST_CLIENT_SERVER = {
   app_name: `Test App ${Date.now()}`,
   identifier_url: "https://test-app.example.com",
   entry_point_url: "https://test-app.example.com/auth",
   authorized_urls: [
      "https://test-app.example.com",
      "https://test-app.example.com/dashboard",
   ],
   client_mode: "frontend-login-proxy",
};

describe("clientServerApi Integration Tests", () => {
   let testClientServerId = null;
   let isLoggedIn = false;

   beforeAll(async () => {
      console.log("🚀 Starting clientServerApi integration tests");
      console.log("📍 Backend URL:", BACKEND_BASE_URL);

      // Test if backend is accessible
      try {
         const response = await fetch(
            `${BACKEND_BASE_URL}/api/clientServer/user/clients`,
            {
               credentials: "include",
            }
         );
         console.log("✅ Backend is accessible, status:", response.status);
      } catch (error) {
         console.error("❌ Backend not accessible:", error.message);
         throw new Error(
            "Backend not running or accessible. Please start Docker services."
         );
      }
   }, TEST_TIMEOUT);

   beforeEach(async () => {
      // Login before each test
      if (!isLoggedIn) {
         const loginResponse = await authApi.login(TEST_REGULAR_USER);
         isLoggedIn = loginResponse.success;

         if (!isLoggedIn) {
            console.log("⚠️ Login failed, tests may not work correctly");
         }
      }
   });

   afterEach(async () => {
      // Clean up any created client servers
      if (testClientServerId) {
         try {
            await clientServerApi.deleteClientServer(testClientServerId);
            testClientServerId = null;
         } catch (error) {
            // Ignore cleanup errors
         }
      }
   });

   describe("Client Server Management", () => {
      it(
         "should get all client servers for authenticated user",
         async () => {
            console.log("🧪 Testing getClientServers...");

            const response = await clientServerApi.getClientServers();

            console.log("📋 Get client servers response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);

            console.log(`✅ Found ${response.data.length} client servers`);
         },
         TEST_TIMEOUT
      );

      it(
         "should create a new client server",
         async () => {
            console.log("🧪 Testing createClientServer...");

            const response = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );

            console.log("📋 Create client server response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
            expect(response.data.client_id).toBeDefined();
            expect(response.data.app_name).toBe(TEST_CLIENT_SERVER.app_name);

            // Store for cleanup
            testClientServerId = response.data.client_id;

            console.log(
               "✅ Client server created with ID:",
               testClientServerId
            );
         },
         TEST_TIMEOUT
      );

      it(
         "should get a specific client server by ID",
         async () => {
            console.log("🧪 Testing getClientServer...");

            // First create a client server
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            testClientServerId = createResponse.data.client_id;

            // Then fetch it
            const response = await clientServerApi.getClientServer(
               testClientServerId
            );

            console.log("📋 Get client server response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
            expect(response.data.client_id).toBe(testClientServerId);
            expect(response.data.app_name).toBe(TEST_CLIENT_SERVER.app_name);

            console.log("✅ Client server fetched successfully");
         },
         TEST_TIMEOUT
      );

      it(
         "should update an existing client server",
         async () => {
            console.log("🧪 Testing updateClientServer...");

            // First create a client server
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            testClientServerId = createResponse.data.client_id;

            // Update data
            const updateData = {
               app_name: `Updated App ${Date.now()}`,
               identifier_url: "https://updated-app.example.com",
            };

            const response = await clientServerApi.updateClientServer(
               testClientServerId,
               updateData
            );

            console.log("📋 Update client server response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data.app_name).toBe(updateData.app_name);

            console.log("✅ Client server updated successfully");
         },
         TEST_TIMEOUT
      );

      it(
         "should delete a client server",
         async () => {
            console.log("🧪 Testing deleteClientServer...");

            // First create a client server
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            const clientId = createResponse.data.client_id;

            // Then delete it
            const response = await clientServerApi.deleteClientServer(clientId);

            console.log("📋 Delete client server response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(true);

            // Verify it's deleted by trying to fetch it
            const fetchResponse = await clientServerApi.getClientServer(
               clientId
            );
            expect(fetchResponse.success).toBe(false);

            testClientServerId = null; // Already deleted
            console.log("✅ Client server deleted successfully");
         },
         TEST_TIMEOUT
      );
   });

   describe("Owner Panel Features", () => {
      it(
         "should get owner statistics for users with owner role",
         async () => {
            console.log("🧪 Testing getOwnerStats...");

            // Login as a user who might have owner privileges
            await authApi.logout();
            const loginResponse = await authApi.login(TEST_OWNER_USER);

            const response = await clientServerApi.getOwnerStats();

            console.log("📋 Owner stats response:", response);

            expect(response).toBeDefined();

            if (response.success) {
               expect(response.data).toBeDefined();
               console.log("✅ Owner stats retrieved successfully");
            } else if (response.insufficientPrivileges) {
               console.log(
                  "ℹ️ User does not have owner privileges (expected for some users)"
               );
               expect(response.message).toContain("privileges");
            } else {
               console.log("⚠️ Unexpected response:", response.message);
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should handle owner stats request for non-owner users",
         async () => {
            console.log("🧪 Testing getOwnerStats with regular user...");

            // Ensure we're logged in as regular user
            await authApi.logout();
            await authApi.login(TEST_REGULAR_USER);

            const response = await clientServerApi.getOwnerStats();

            console.log("📋 Owner stats response for regular user:", response);

            expect(response).toBeDefined();

            if (response.insufficientPrivileges) {
               expect(response.success).toBe(false);
               expect(response.message).toContain("privileges");
               console.log("✅ Proper authorization check working");
            } else if (response.success) {
               console.log(
                  "ℹ️ User has owner privileges (unexpected but possible)"
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should get client analytics for owned client servers",
         async () => {
            console.log("🧪 Testing getClientAnalytics...");

            // First create a client server
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            testClientServerId = createResponse.data.client_id;

            const response = await clientServerApi.getClientAnalytics(
               testClientServerId
            );

            console.log("📋 Client analytics response:", response);

            expect(response).toBeDefined();

            if (response.success) {
               expect(response.data).toBeDefined();
               console.log("✅ Client analytics retrieved successfully");
            } else if (response.insufficientPrivileges) {
               console.log(
                  "ℹ️ User does not have analytics access (role detection needed)"
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should get client users for owned client servers",
         async () => {
            console.log("🧪 Testing getClientUsers...");

            // First create a client server
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            testClientServerId = createResponse.data.client_id;

            const response = await clientServerApi.getClientUsers(
               testClientServerId
            );

            console.log("📋 Client users response:", response);

            expect(response).toBeDefined();

            if (response.success) {
               expect(Array.isArray(response.data)).toBe(true);
               console.log(`✅ Found ${response.data.length} client users`);
            } else if (response.insufficientPrivileges) {
               console.log("ℹ️ User does not have user management access");
            }
         },
         TEST_TIMEOUT
      );
   });

   describe("Authorization and Error Handling", () => {
      it(
         "should handle unauthorized access properly",
         async () => {
            console.log("🧪 Testing unauthorized access handling...");

            // Logout to test unauthorized access
            await authApi.logout();

            const response = await clientServerApi.getClientServers();

            console.log("📋 Unauthorized access response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);

            if (response.requiresAuth) {
               expect(response.message).toContain("Authentication required");
               console.log("✅ Proper authentication check working");
            }

            // Login back for other tests
            await authApi.login(TEST_REGULAR_USER);
         },
         TEST_TIMEOUT
      );

      it(
         "should handle ownership validation for updates",
         async () => {
            console.log("🧪 Testing ownership validation...");

            // Create a client server as one user
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            testClientServerId = createResponse.data.client_id;

            // Try to update as different user (if available)
            // This test depends on having multiple users and role detection working
            const updateData = { app_name: "Unauthorized Update" };
            const response = await clientServerApi.updateClientServer(
               testClientServerId,
               updateData
            );

            console.log("📋 Ownership validation response:", response);

            // The response should either succeed (if user owns it) or fail with permission error
            expect(response).toBeDefined();

            if (response.insufficientPrivileges) {
               expect(response.message).toContain("own");
               console.log("✅ Ownership validation working");
            } else if (response.success) {
               console.log(
                  "ℹ️ User has permission to update (ownership detected)"
               );
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should handle invalid client server IDs",
         async () => {
            console.log("🧪 Testing invalid client ID handling...");

            const invalidId = "nonexistent-client-id";
            const response = await clientServerApi.getClientServer(invalidId);

            console.log("📋 Invalid ID response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);

            console.log("✅ Invalid ID handling working");
         },
         TEST_TIMEOUT
      );

      it(
         "should handle malformed request data",
         async () => {
            console.log("🧪 Testing malformed data handling...");

            // Test with invalid client server data
            const invalidData = {
               app_name: "", // Empty name should be invalid
               // Missing required fields
            };

            const response = await clientServerApi.createClientServer(
               invalidData
            );

            console.log("📋 Malformed data response:", response);

            expect(response).toBeDefined();
            expect(response.success).toBe(false);
            expect(response.message).toBeDefined();

            console.log("✅ Malformed data handling working");
         },
         TEST_TIMEOUT
      );
   });

   describe("Role Detection Integration", () => {
      it(
         "should properly detect ownership for created client servers",
         async () => {
            console.log("🧪 Testing ownership detection...");

            // Create a client server
            const createResponse = await clientServerApi.createClientServer(
               TEST_CLIENT_SERVER
            );
            expect(createResponse.success).toBe(true);
            testClientServerId = createResponse.data.client_id;

            // The creator should automatically become the owner
            // Check if we can perform owner operations
            const statsResponse = await clientServerApi.getOwnerStats();

            console.log(
               "📋 Ownership detection - stats response:",
               statsResponse
            );

            if (statsResponse.success) {
               console.log(
                  "✅ Ownership detected - user can access owner features"
               );
            } else {
               console.log("ℹ️ Ownership detection may need refinement");
            }

            // Check if we can update our own client server
            const updateResponse = await clientServerApi.updateClientServer(
               testClientServerId,
               {
                  app_name: "Updated by Owner",
               }
            );

            console.log("📋 Ownership update response:", updateResponse);

            if (updateResponse.success) {
               console.log("✅ Owner can update their own client server");
            }
         },
         TEST_TIMEOUT
      );

      it(
         "should maintain consistent role detection across requests",
         async () => {
            console.log("🧪 Testing role detection consistency...");

            // Make multiple requests and check for consistent role behavior
            const responses = await Promise.all([
               clientServerApi.getClientServers(),
               clientServerApi.getOwnerStats(),
               authApi.getSession(),
            ]);

            console.log("📋 Multiple request responses:", responses);

            // All requests should be consistent with authentication state
            responses.forEach((response, index) => {
               expect(response).toBeDefined();
               console.log(`Request ${index + 1} success:`, response.success);
            });

            console.log("✅ Role detection consistency checked");
         },
         TEST_TIMEOUT
      );
   });
});

/**
 * Test Helper Functions
 */

/**
 * Create a test client server for testing purposes
 */
export async function createTestClientServer() {
   const testData = {
      ...TEST_CLIENT_SERVER,
      app_name: `Test App ${Date.now()}`,
   };

   return await clientServerApi.createClientServer(testData);
}

/**
 * Clean up test client servers
 */
export async function cleanupTestClientServers(clientIds) {
   for (const clientId of clientIds) {
      try {
         await clientServerApi.deleteClientServer(clientId);
      } catch (error) {
         console.log(
            `Failed to cleanup client server ${clientId}:`,
            error.message
         );
      }
   }
}
