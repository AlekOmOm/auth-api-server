// Test script for Auth System Backend API - Fixed version
// This version properly handles schema contexts to avoid cross-schema access issues

import fetch from "node-fetch";
import fs from "fs/promises";

const API_BASE = process.env.API_BASE || "http://localhost:3001/api";
const TEST_MODE = process.env.TEST_MODE || "auth_internal"; // Can be "auth_internal" or "client"

// Test data
const testData = {
   authUser: {
      email: "owner@example.com",
      password: "password123",
   },
   newUser: {
      name: "New Test User",
      email: "newuser" + Date.now() + "@example.com",
      password: "Password123",
      role: "user",
   },
   clientApp: {
      app_name: "Test Trading Simulator",
      allowed_return_urls: [
         "https://trading-sim.com",
         "https://trading-sim.com/app",
      ],
      client_mode: "test",
   },
};

const loginData = {
   credentials: testData.authUser,
};

// Track session
let sessionCookie = null;
let bearerToken = null;
let testResults = [];
let testClientId = null;
let testClientSecret = null;
let testUserId = null;

// Generate log file name with timestamp
const timestamp = new Date().toISOString().replace(/:/g, "-");
const logFile = `test-results-${timestamp}.log`;

async function writeLog(message) {
   const timestampedMessage = `[${new Date().toISOString()}] ${message}\n`;
   await fs.appendFile(logFile, timestampedMessage);
   console.log(message);
}

async function logTestResult(testName, status, response, error = null) {
   const result = {
      test: testName,
      status,
      success: status >= 200 && status < 300,
      timestamp: new Date().toISOString(),
      response: response,
      error: error,
   };
   testResults.push(result);

   await writeLog(`\n${testName}`);
   await writeLog(`   Status: ${status} ${result.success ? "✓" : "✗"}`);

   if (error) {
      await writeLog(`   Error: ${error}`);
   } else if (response) {
      const responseStr =
         typeof response === "string"
            ? response
            : JSON.stringify(response, null, 2);
      const shortResponse =
         responseStr.length > 200
            ? responseStr.substring(0, 200) + "..."
            : responseStr;
      await writeLog(`   Response: ${shortResponse}`);
   }
}

function extractSessionCookie(response) {
   if (!response || !response.headers) {
      return null;
   }
   // node-fetch returns Headers object, need to use .get() or .raw()
   let setCookieHeader;
   if (response.headers.raw) {
      // node-fetch v2 style
      const raw = response.headers.raw();
      setCookieHeader = raw["set-cookie"];
   } else if (response.headers.get) {
      // node-fetch v3 style or standard Headers
      setCookieHeader = response.headers.get("set-cookie");
   } else {
      // fallback to direct access
      setCookieHeader = response.headers["set-cookie"];
   }

   if (setCookieHeader) {
      const cookies = Array.isArray(setCookieHeader)
         ? setCookieHeader
         : [setCookieHeader];
      const sessionCookie = cookies.find(
         (cookie) => cookie && cookie.includes("auth-system.sid")
      );
      if (sessionCookie) {
         return sessionCookie.split(";")[0];
      }
   }
   return null;
}

async function makeRequest(method, endpoint, options = {}) {
   const headers = {
      "Content-Type": "application/json",
      ...options.headers,
   };

   // Only add X-Schema-Context for client mode or specific endpoints
   if (TEST_MODE === "client" || options.forceSchemaContext) {
      headers["X-Schema-Context"] = "http://localhost:3000/";
   }

   if (sessionCookie && !options.skipAuth) {
      headers.Cookie = sessionCookie;
   }

   if (bearerToken && options.useBearer) {
      headers.Authorization = `Bearer ${bearerToken}`;
      delete headers.Cookie;
   }

   const fetchOptions = {
      method,
      headers,
   };

   if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
   }

   try {
      const response = await fetch(`${API_BASE}${endpoint}`, fetchOptions);
      const text = await response.text();
      let data;
      try {
         data = JSON.parse(text);
      } catch {
         data = text;
      }

      return {
         status: response.status,
         data,
         headers: response.headers,
         success: response.status >= 200 && response.status < 300,
      };
   } catch (error) {
      return {
         status: 0,
         data: null,
         error: error.message,
         success: false,
      };
   }
}

async function testAuthenticationEndpoints() {
   await writeLog("\n=== AUTHENTICATION ENDPOINTS ===\n");

   await writeLog("1. POST /auth/register - Register new user");

   // Create a unique email for this specific registration attempt
   const uniqueEmailForRegistration = "newuser" + Date.now() + "@example.com";

   let registrationApiPayload;
   if (TEST_MODE === "auth_internal") {
      registrationApiPayload = {
         name: testData.newUser.name,
         email: uniqueEmailForRegistration,
         password: testData.newUser.password,
         role: "owner", // CRITICAL: Ensure 'owner' role for auth_internal successful registration
         userType: "auth", // userType for backend controller to select auth_internal schema
      };
   } else {
      // Corresponds to TEST_MODE === "client"
      registrationApiPayload = {
         name: testData.newUser.name,
         email: uniqueEmailForRegistration,
         password: testData.newUser.password,
         role: "user", // 'user' role is correct for client schemas
         userType: "client", // userType for backend controller (often implies schema via Referer/X-Schema-Context)
      };
   }
   // Note: The 'role' field in the global testData.newUser is effectively overridden here
   // by explicitly setting it based on TEST_MODE for the API call.

   const registerResult = await makeRequest("POST", "/auth/register", {
      body: registrationApiPayload, // Use the correctly constructed payload
      skipAuth: true,
      forceSchemaContext: TEST_MODE === "client", // Add X-Schema-Context header for client mode
   });
   await logTestResult(
      "POST /auth/register",
      registerResult.status,
      registerResult.data,
      registerResult.error
   );

   await writeLog("\n2. POST /auth/login - User login");
   const loginResult = await makeRequest("POST", "/auth/login", {
      body: loginData,
      skipAuth: true,
   });
   await logTestResult(
      "POST /auth/login",
      loginResult.status,
      loginResult.data,
      loginResult.error
   );

   if (loginResult.success && loginResult.headers) {
      sessionCookie = extractSessionCookie(loginResult);
      await writeLog(
         `   Session cookie extracted: ${sessionCookie ? "Yes" : "No"}`
      );
   }

   await writeLog("\n3. GET /auth/session - Get current session");
   const sessionResult = await makeRequest("GET", "/auth/session");
   await logTestResult(
      "GET /auth/session",
      sessionResult.status,
      sessionResult.data,
      sessionResult.error
   );

   await writeLog("\n4. GET /auth/me - Get current user (non-admin)");
   const meResult = await makeRequest("GET", "/auth/me");
   await logTestResult(
      "GET /auth/me",
      meResult.status,
      meResult.data,
      meResult.error
   );

   await writeLog("\n5. GET /auth/admin - Get current admin user");
   const adminResult = await makeRequest("GET", "/auth/admin");
   await logTestResult(
      "GET /auth/admin",
      adminResult.status,
      adminResult.data,
      adminResult.error
   );

   await writeLog(
      "\n6. POST /auth/sessions - Get all sessions for current user"
   );
   const sessionsResult = await makeRequest("POST", "/auth/sessions");
   await logTestResult(
      "POST /auth/sessions",
      sessionsResult.status,
      sessionsResult.data,
      sessionsResult.error
   );

   await writeLog("\n7. POST /auth/logout - User logout");
   const logoutResult = await makeRequest("POST", "/auth/logout");
   await logTestResult(
      "POST /auth/logout",
      logoutResult.status,
      logoutResult.data,
      logoutResult.error
   );
}

async function testClientServerManagement() {
   await writeLog("\n=== CLIENT SERVER MANAGEMENT ===\n");

   await writeLog(
      "1. POST /clientServer/register - Register new client (public)"
   );
   const clientRegisterData = {
      app_name: "Public Test App",
      allowed_return_urls: [
         "https://public-app.com",
         "https://public-app.com/callback",
      ],
   };
   const clientRegisterResult = await makeRequest(
      "POST",
      "/clientServer/register",
      {
         body: clientRegisterData,
         skipAuth: true,
      }
   );
   await logTestResult(
      "POST /clientServer/register",
      clientRegisterResult.status,
      clientRegisterResult.data,
      clientRegisterResult.error
   );
   if (clientRegisterResult.success && clientRegisterResult.data.data) {
      testClientId = clientRegisterResult.data.data.client_id;
      testClientSecret = clientRegisterResult.data.data.client_secret;
   }

   await writeLog("\n2. POST /clientServer/handshake - Client authentication");
   if (testClientId && testClientSecret) {
      const handshakeData = {
         client_id: testClientId,
         client_secret: testClientSecret,
      };
      const handshakeResult = await makeRequest(
         "POST",
         "/clientServer/handshake",
         {
            body: handshakeData,
            skipAuth: true,
         }
      );
      await logTestResult(
         "POST /clientServer/handshake",
         handshakeResult.status,
         handshakeResult.data,
         handshakeResult.error
      );

      if (handshakeResult.success && handshakeResult.data.data) {
         bearerToken = handshakeResult.data.data.token;
      }
   } else {
      await writeLog("   Skipped: No client credentials available");
   }

   await writeLog("\n3. GET /clientServer/me - Get current client info");
   const clientMeResult = await makeRequest("GET", "/clientServer/me", {
      useBearer: true,
   });
   await logTestResult(
      "GET /clientServer/me",
      clientMeResult.status,
      clientMeResult.data,
      clientMeResult.error
   );

   await writeLog("\n4. PUT /clientServer/me - Update current client info");
   const updateClientData = {
      app_name: "Updated Public Test App",
      allowed_return_urls: [
         "https://public-app.com",
         "https://public-app.com/new-callback",
      ],
   };
   const updateClientResult = await makeRequest("PUT", "/clientServer/me", {
      body: updateClientData,
      useBearer: true,
   });
   await logTestResult(
      "PUT /clientServer/me",
      updateClientResult.status,
      updateClientResult.data,
      updateClientResult.error
   );

   await writeLog("\n5. Re-login for session-based tests");
   const reLoginResult = await makeRequest("POST", "/auth/login", {
      body: loginData,
      skipAuth: true,
   });
   if (reLoginResult.success && reLoginResult.headers) {
      sessionCookie = extractSessionCookie(reLoginResult);
   }

   await writeLog(
      "\n6. POST /clientServer/user/register - Register client for logged-in user"
   );
   const userClientData = {
      app_name: testData.clientApp.app_name,
      allowed_return_urls: testData.clientApp.allowed_return_urls,
      client_mode: testData.clientApp.client_mode,
   };
   const userClientResult = await makeRequest(
      "POST",
      "/clientServer/user/register",
      {
         body: userClientData,
      }
   );
   await logTestResult(
      "POST /clientServer/user/register",
      userClientResult.status,
      userClientResult.data,
      userClientResult.error
   );

   await writeLog(
      "\n7. GET /clientServer/user/clients - Get all clients for user"
   );
   const userClientsResult = await makeRequest(
      "GET",
      "/clientServer/user/clients"
   );
   await logTestResult(
      "GET /clientServer/user/clients",
      userClientsResult.status,
      userClientsResult.data,
      userClientsResult.error
   );

   if (
      userClientsResult.success &&
      userClientsResult.data.data?.clients?.length > 0
   ) {
      const clientId = userClientsResult.data.data.clients[0].client_id;

      await writeLog(
         "\n8. GET /clientServer/user/clients/{id} - Get specific client"
      );
      const specificClientResult = await makeRequest(
         "GET",
         `/clientServer/user/clients/${clientId}`
      );
      await logTestResult(
         `GET /clientServer/user/clients/${clientId}`,
         specificClientResult.status,
         specificClientResult.data,
         specificClientResult.error
      );

      await writeLog(
         "\n9. PUT /clientServer/user/clients/{id} - Update client"
      );
      const updateData = {
         app_name: "Updated Trading Simulator",
         allowed_return_urls: [
            "https://trading-sim.com",
            "https://trading-sim.com/app",
            "https://trading-sim.com/api",
         ],
      };
      const updateResult = await makeRequest(
         "PUT",
         `/clientServer/user/clients/${clientId}`,
         {
            body: updateData,
         }
      );
      await logTestResult(
         `PUT /clientServer/user/clients/${clientId}`,
         updateResult.status,
         updateResult.data,
         updateResult.error
      );
   }

   await writeLog("\n10. GET /clientServer/{id} - Get any client (admin only)");
   if (testClientId) {
      const adminClientResult = await makeRequest(
         "GET",
         `/clientServer/${testClientId}`
      );
      await logTestResult(
         `GET /clientServer/${testClientId}`,
         adminClientResult.status,
         adminClientResult.data,
         adminClientResult.error
      );
   }
}

async function testUserManagement() {
   await writeLog("\n=== USER MANAGEMENT ===\n");

   await writeLog("1. GET /users - Get all users");
   const usersResult = await makeRequest("GET", "/users");
   await logTestResult(
      "GET /users",
      usersResult.status,
      usersResult.data,
      usersResult.error
   );

   if (usersResult.success && usersResult.data.data?.users?.length > 0) {
      testUserId = usersResult.data.data.users[0].id;

      await writeLog("\n2. GET /users/{id} - Get user by ID");
      const userResult = await makeRequest("GET", `/users/${testUserId}`);
      await logTestResult(
         `GET /users/${testUserId}`,
         userResult.status,
         userResult.data,
         userResult.error
      );

      await writeLog("\n3. PUT /users/{id} - Update user");
      const updateUserData = {
         name: "Updated User Name",
         email: "updated@example.com",
      };
      const updateResult = await makeRequest("PUT", `/users/${testUserId}`, {
         body: updateUserData,
      });
      await logTestResult(
         `PUT /users/${testUserId}`,
         updateResult.status,
         updateResult.data,
         updateResult.error
      );
   }
}

async function testOwnerManagement() {
   await writeLog("\n=== OWNER MANAGEMENT ===\n");

   await writeLog("1. GET /owner/stats - Get owner statistics");
   const statsResult = await makeRequest("GET", "/owner/stats");
   await logTestResult(
      "GET /owner/stats",
      statsResult.status,
      statsResult.data,
      statsResult.error
   );

   const clientsResult = await makeRequest("GET", "/clientServer/user/clients");
   if (clientsResult.success && clientsResult.data.data?.clients?.length > 0) {
      const clientId = clientsResult.data.data.clients[0].client_id;

      await writeLog(
         "\n2. GET /owner/clients/{clientId}/users - Get users in client schema"
      );
      const clientUsersResult = await makeRequest(
         "GET",
         `/owner/clients/${clientId}/users`
      );
      await logTestResult(
         `GET /owner/clients/${clientId}/users`,
         clientUsersResult.status,
         clientUsersResult.data,
         clientUsersResult.error
      );

      await writeLog(
         "\n3. POST /owner/clients/{clientId}/users - Create user in client schema"
      );
      const newUserData = {
         name: "Client User",
         email: "clientuser@example.com",
         password: "ClientUser123!",
         role: "user",
      };
      const createUserResult = await makeRequest(
         "POST",
         `/owner/clients/${clientId}/users`,
         {
            body: newUserData,
         }
      );
      await logTestResult(
         `POST /owner/clients/${clientId}/users`,
         createUserResult.status,
         createUserResult.data,
         createUserResult.error
      );

      if (createUserResult.success && createUserResult.data.data?.id) {
         const userId = createUserResult.data.data.id;

         await writeLog(
            "\n4. GET /owner/clients/{clientId}/users/{userId} - Get specific user"
         );
         const specificUserResult = await makeRequest(
            "GET",
            `/owner/clients/${clientId}/users/${userId}`
         );
         await logTestResult(
            `GET /owner/clients/${clientId}/users/${userId}`,
            specificUserResult.status,
            specificUserResult.data,
            specificUserResult.error
         );

         await writeLog(
            "\n5. PUT /owner/clients/{clientId}/users/{userId} - Update user"
         );
         const updateUserData = {
            name: "Updated Client User",
         };
         const updateUserResult = await makeRequest(
            "PUT",
            `/owner/clients/${clientId}/users/${userId}`,
            {
               body: updateUserData,
            }
         );
         await logTestResult(
            `PUT /owner/clients/${clientId}/users/${userId}`,
            updateUserResult.status,
            updateUserResult.data,
            updateUserResult.error
         );

         await writeLog(
            "\n6. DELETE /owner/clients/{clientId}/users/{userId} - Delete user"
         );
         const deleteUserResult = await makeRequest(
            "DELETE",
            `/owner/clients/${clientId}/users/${userId}`
         );
         await logTestResult(
            `DELETE /owner/clients/${clientId}/users/${userId}`,
            deleteUserResult.status,
            deleteUserResult.data,
            deleteUserResult.error
         );
      }

      await writeLog(
         "\n7. GET /owner/clients/{clientId}/analytics - Get client analytics"
      );
      const analyticsResult = await makeRequest(
         "GET",
         `/owner/clients/${clientId}/analytics`
      );
      await logTestResult(
         `GET /owner/clients/${clientId}/analytics`,
         analyticsResult.status,
         analyticsResult.data,
         analyticsResult.error
      );
   }
}

async function testSchemaManagement() {
   await writeLog("\n=== SCHEMA MANAGEMENT ===\n");

   await writeLog("1. GET /schema - List all schemas");
   const schemasResult = await makeRequest("GET", "/schema");
   await logTestResult(
      "GET /schema",
      schemasResult.status,
      schemasResult.data,
      schemasResult.error
   );

   await writeLog("\n2. POST /schema - Create new schema");
   const newSchemaData = {
      schema_name: "client_test_schema",
   };
   const createSchemaResult = await makeRequest("POST", "/schema", {
      body: newSchemaData,
   });
   await logTestResult(
      "POST /schema",
      createSchemaResult.status,
      createSchemaResult.data,
      createSchemaResult.error
   );

   await writeLog("\n3. PUT /schema/{schemaId} - Update schema");
   const updateSchemaData = {
      schema_name: "client_updated_schema",
   };
   const updateSchemaResult = await makeRequest("PUT", "/schema/1", {
      body: updateSchemaData,
   });
   await logTestResult(
      "PUT /schema/1",
      updateSchemaResult.status,
      updateSchemaResult.data,
      updateSchemaResult.error
   );

   await writeLog("\n4. DELETE /schema/{schemaId} - Delete schema");
   const deleteSchemaResult = await makeRequest("DELETE", "/schema/1");
   await logTestResult(
      "DELETE /schema/1",
      deleteSchemaResult.status,
      deleteSchemaResult.data,
      deleteSchemaResult.error
   );
}

async function generateSummaryReport() {
   await writeLog("\n\n=== TEST SUMMARY ===");
   await writeLog(`Total Tests: ${testResults.length}`);

   const passed = testResults.filter((r) => r.success).length;
   const failed = testResults.filter((r) => !r.success).length;

   await writeLog(`Passed: ${passed} ✓`);
   await writeLog(`Failed: ${failed} ✗`);
   await writeLog(
      `Success Rate: ${((passed / testResults.length) * 100).toFixed(1)}%`
   );

   if (failed > 0) {
      await writeLog("\n=== FAILED TESTS ===");
      testResults
         .filter((r) => !r.success)
         .forEach(async (result) => {
            await writeLog(`\n${result.test}`);
            await writeLog(`   Status: ${result.status}`);
            if (result.error) {
               await writeLog(`   Error: ${result.error}`);
            } else if (result.response?.message) {
               await writeLog(`   Message: ${result.response.message}`);
            }
         });
   }

   await writeLog(`\n\nDetailed results saved to: ${logFile}`);

   const summaryFile = logFile.replace(".log", "-summary.json");
   await fs.writeFile(summaryFile, JSON.stringify(testResults, null, 2));
   await writeLog(`JSON summary saved to: ${summaryFile}`);
}

async function runAllTests() {
   await fs.writeFile(
      logFile,
      `Backend API Test Results - ${new Date().toISOString()}\n`
   );
   await fs.writeFile(
      logFile + ".header",
      `Testing Backend API at ${API_BASE}\n=====================================\n`
   );

   await writeLog("Testing Backend API at " + API_BASE);
   await writeLog(`Test Mode: ${TEST_MODE}`);
   await writeLog("=====================================");

   try {
      await testAuthenticationEndpoints();
      await testClientServerManagement();
      await testUserManagement();
      await testOwnerManagement();
      await testSchemaManagement();
   } catch (error) {
      await writeLog(`\n\nFATAL ERROR: ${error.message}`);
      await writeLog(error.stack);
   }

   await generateSummaryReport();
}

runAllTests().catch(async (error) => {
   console.error("Test runner failed:", error);
   await writeLog(`Test runner failed: ${error.message}`);
});
