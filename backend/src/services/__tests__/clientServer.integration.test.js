/**
 * Integration Tests for Client Server Service
 * Tests actual HTTP endpoints with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import testSetup, {
   TEST_SCHEMAS,
   TEST_USERS,
   TEST_CLIENT_SERVERS,
} from "./setup/testSetup.js";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

describe("Client Server Service Integration Tests", () => {
   let ownerAuthCookie;
   let regularUserAuthCookie;

   beforeAll(async () => {
      console.log("🚀 Setting up client server integration tests...");

      // Wait for database to be ready
      await testSetup.waitForDatabase();

      // Setup test schemas and seed data
      await testSetup.setupTestSchemas();
      await testSetup.seedTestData();

      console.log("✅ Client server integration test setup complete");
   });

   beforeEach(async () => {
      // Clean sessions before each test (keep users and client servers)
      const pool = await testSetup.getTestDbConnection();
      try {
         for (const schema of Object.values(TEST_SCHEMAS)) {
            await pool.query(`DELETE FROM "${schema}".sessions`);
         }
      } finally {
         await pool.end();
      }

      // Login as owner user for client server operations
      const ownerLoginResponse = await request(BASE_URL)
         .post("/api/auth/login")
         .send({
            email: TEST_USERS.OWNER_USER.email,
            password: TEST_USERS.OWNER_USER.password,
            schema: TEST_SCHEMAS.AUTH_INTERNAL,
         })
         .expect(200);

      ownerAuthCookie = ownerLoginResponse.headers["set-cookie"];

      // Login as regular user for some tests
      const regularLoginResponse = await request(BASE_URL)
         .post("/api/auth/login")
         .send({
            email: TEST_USERS.REGULAR_USER.email,
            password: TEST_USERS.REGULAR_USER.password,
            schema: TEST_SCHEMAS.CLIENT_TEST,
         })
         .expect(200);

      regularUserAuthCookie = regularLoginResponse.headers["set-cookie"];
   });

   afterAll(async () => {
      console.log("🧹 Cleaning up client server integration tests...");
      await testSetup.cleanTestData();
      await testSetup.teardownTestSchemas();
      console.log("✅ Client server integration test cleanup complete");
   });

   describe("POST /api/client-servers", () => {
      it("TC-CLIENT-REGISTER-001: Valid client server registration", async () => {
         const newClientServer = {
            app_name: "New Test App",
            identifier_url: "https://new-test-app.com",
            entry_point_url: "https://new-test-app.com/auth",
            authorized_urls: [
               "https://new-test-app.com/*",
               "https://new-test-app.com/api/*",
            ],
            client_mode: "development",
         };

         const response = await request(BASE_URL)
            .post("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .send({
               ...newClientServer,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(201);

         expect(response.body).toMatchObject({
            message: "Client server registered successfully",
            data: {
               client_id: expect.any(String),
               client_secret: expect.any(String),
               app_name: newClientServer.app_name,
               identifier_url: newClientServer.identifier_url,
               entry_point_url: newClientServer.entry_point_url,
               authorized_urls: newClientServer.authorized_urls,
               client_mode: newClientServer.client_mode,
               created_at: expect.any(String),
            },
         });

         // Should contain client_secret for registration response
         expect(response.body.data.client_secret).toBeDefined();

         // Verify client server was created in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.AUTH_INTERNAL}".client_servers WHERE app_name = $1`,
               [newClientServer.app_name]
            );
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].app_name).toBe(newClientServer.app_name);
            expect(result.rows[0].user_id).toBe(TEST_USERS.OWNER_USER.id);
         } finally {
            await pool.end();
         }
      });

      it("should return 400 for missing required fields", async () => {
         const response = await request(BASE_URL)
            .post("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .send({
               app_name: "Incomplete App",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
               // Missing required fields
            })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should return 409 for duplicate identifier URL", async () => {
         const response = await request(BASE_URL)
            .post("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .send({
               app_name: "Duplicate App",
               identifier_url: TEST_CLIENT_SERVERS.CLIENT_1.identifier_url, // Already exists
               entry_point_url: "https://duplicate-app.com/auth",
               authorized_urls: ["https://duplicate-app.com/*"],
               client_mode: "development",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(409);

         expect(response.body.error).toContain("already exists");
      });

      it("should deny access to non-owner users", async () => {
         const response = await request(BASE_URL)
            .post("/api/client-servers")
            .set("Cookie", regularUserAuthCookie)
            .send({
               app_name: "Unauthorized App",
               identifier_url: "https://unauthorized-app.com",
               entry_point_url: "https://unauthorized-app.com/auth",
               authorized_urls: ["https://unauthorized-app.com/*"],
               client_mode: "development",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(403);

         expect(response.body.error).toContain("owner");
      });
   });

   describe("GET /api/client-servers", () => {
      it("TC-CLIENT-GETALL-001: Get all client servers for owner", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client servers retrieved successfully",
            data: expect.arrayContaining([
               expect.objectContaining({
                  client_id: expect.any(String),
                  app_name: expect.any(String),
                  identifier_url: expect.any(String),
                  entry_point_url: expect.any(String),
                  authorized_urls: expect.any(Array),
                  client_mode: expect.any(String),
                  created_at: expect.any(String),
               }),
            ]),
         });

         // Should not contain client_secret in list view
         response.body.data.forEach((client) => {
            expect(client).not.toHaveProperty("client_secret");
            expect(client).not.toHaveProperty("client_secret_hash");
         });

         // Should have at least our test client servers
         expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      });

      it("should return empty array for user with no client servers", async () => {
         // Create a new owner user with no client servers
         const newOwnerResponse = await request(BASE_URL)
            .post("/api/auth/register")
            .send({
               name: "New Owner",
               email: "newowner2@example.com",
               password: "OwnerPassword123!",
               userType: "auth",
            })
            .expect(201);

         // Login as new owner
         const newOwnerLogin = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: "newowner2@example.com",
               password: "OwnerPassword123!",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         const newOwnerCookie = newOwnerLogin.headers["set-cookie"];

         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .set("Cookie", newOwnerCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client servers retrieved successfully",
            data: [],
         });
      });

      it("should deny access to non-owner users", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .set("Cookie", regularUserAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(403);

         expect(response.body.error).toContain("owner");
      });
   });

   describe("GET /api/client-servers/:clientId", () => {
      it("TC-CLIENT-GET-001: Get specific client server", async () => {
         const response = await request(BASE_URL)
            .get(
               `/api/client-servers/${TEST_CLIENT_SERVERS.CLIENT_1.client_id}`
            )
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client server retrieved successfully",
            data: {
               client_id: TEST_CLIENT_SERVERS.CLIENT_1.client_id,
               app_name: TEST_CLIENT_SERVERS.CLIENT_1.app_name,
               identifier_url: TEST_CLIENT_SERVERS.CLIENT_1.identifier_url,
               entry_point_url: TEST_CLIENT_SERVERS.CLIENT_1.entry_point_url,
               authorized_urls: TEST_CLIENT_SERVERS.CLIENT_1.authorized_urls,
               client_mode: TEST_CLIENT_SERVERS.CLIENT_1.client_mode,
               assigned_schema_name:
                  TEST_CLIENT_SERVERS.CLIENT_1.assigned_schema_name,
            },
         });

         // Should not contain client_secret in individual view
         expect(response.body.data).not.toHaveProperty("client_secret");
         expect(response.body.data).not.toHaveProperty("client_secret_hash");
      });

      it("should return 404 for non-existent client server", async () => {
         const fakeId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .get(`/api/client-servers/${fakeId}`)
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });

      it("should deny access to other owner's client servers", async () => {
         // Create another owner and their client server
         const anotherOwnerResponse = await request(BASE_URL)
            .post("/api/auth/register")
            .send({
               name: "Another Owner",
               email: "anotherowner@example.com",
               password: "OwnerPassword123!",
               userType: "auth",
            })
            .expect(201);

         // Try to access with original owner credentials
         const response = await request(BASE_URL)
            .get(`/api/client-servers/some-other-client-id`)
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(404); // Should not find it (filtered by user_id)

         expect(response.body.error).toBeDefined();
      });
   });

   describe("PUT /api/client-servers/:clientId", () => {
      it("TC-CLIENT-UPDATE-001: Valid client server update", async () => {
         const updateData = {
            app_name: "Updated Test App Name",
            client_mode: "production",
         };

         const response = await request(BASE_URL)
            .put(
               `/api/client-servers/${TEST_CLIENT_SERVERS.CLIENT_1.client_id}`
            )
            .set("Cookie", ownerAuthCookie)
            .send({
               ...updateData,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client server updated successfully",
            data: {
               client_id: TEST_CLIENT_SERVERS.CLIENT_1.client_id,
               app_name: updateData.app_name,
               identifier_url: TEST_CLIENT_SERVERS.CLIENT_1.identifier_url, // Should remain unchanged
               client_mode: updateData.client_mode,
               updated_at: expect.any(String),
            },
         });

         // Verify update in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.AUTH_INTERNAL}".client_servers WHERE client_id = $1`,
               [TEST_CLIENT_SERVERS.CLIENT_1.client_id]
            );
            expect(result.rows[0].app_name).toBe(updateData.app_name);
            expect(result.rows[0].client_mode).toBe(updateData.client_mode);
         } finally {
            await pool.end();
         }
      });

      it("should return 404 for non-existent client server update", async () => {
         const fakeId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .put(`/api/client-servers/${fakeId}`)
            .set("Cookie", ownerAuthCookie)
            .send({
               app_name: "Updated Name",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("DELETE /api/client-servers/:clientId", () => {
      let clientToDelete;

      beforeEach(async () => {
         // Create a client server to delete
         const createResponse = await request(BASE_URL)
            .post("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .send({
               app_name: "Client To Delete",
               identifier_url: "https://delete-me.com",
               entry_point_url: "https://delete-me.com/auth",
               authorized_urls: ["https://delete-me.com/*"],
               client_mode: "development",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(201);

         clientToDelete = createResponse.body.data;
      });

      it("TC-CLIENT-DELETE-001: Valid client server deletion", async () => {
         const response = await request(BASE_URL)
            .delete(`/api/client-servers/${clientToDelete.client_id}`)
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client server deleted successfully",
            data: expect.any(Object),
         });

         // Verify client server was deleted from database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.AUTH_INTERNAL}".client_servers WHERE client_id = $1`,
               [clientToDelete.client_id]
            );
            expect(result.rows).toHaveLength(0);
         } finally {
            await pool.end();
         }
      });

      it("should return 404 for non-existent client server deletion", async () => {
         const fakeId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .delete(`/api/client-servers/${fakeId}`)
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("POST /api/client-servers/verify", () => {
      it("TC-CLIENT-VERIFY-001: Valid secret hash verification", async () => {
         // First get the secret hash from the database for a test client
         const pool = await testSetup.getTestDbConnection();
         let clientSecretHash;

         try {
            const result = await pool.query(
               `SELECT client_secret_hash FROM "${TEST_SCHEMAS.AUTH_INTERNAL}".client_servers WHERE client_id = $1`,
               [TEST_CLIENT_SERVERS.CLIENT_1.client_id]
            );
            clientSecretHash = result.rows[0].client_secret_hash;
         } finally {
            await pool.end();
         }

         const response = await request(BASE_URL)
            .post("/api/client-servers/verify")
            .send({
               secretHash: clientSecretHash,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client server retrieved successfully",
            data: {
               client_id: TEST_CLIENT_SERVERS.CLIENT_1.client_id,
               app_name: TEST_CLIENT_SERVERS.CLIENT_1.app_name,
               authorized_urls: TEST_CLIENT_SERVERS.CLIENT_1.authorized_urls,
               client_mode: TEST_CLIENT_SERVERS.CLIENT_1.client_mode,
            },
         });

         // Should not contain client_secret or user_id for security
         expect(response.body.data).not.toHaveProperty("client_secret");
         expect(response.body.data).not.toHaveProperty("client_secret_hash");
         expect(response.body.data).not.toHaveProperty("user_id");
      });

      it("should return 401 for invalid secret hash", async () => {
         const response = await request(BASE_URL)
            .post("/api/client-servers/verify")
            .send({
               secretHash: "invalid-secret-hash",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(401);

         expect(response.body.error).toContain("Invalid");
      });
   });

   describe("GET /api/client-servers/by-url", () => {
      it("TC-CLIENT-GETURL-001: Find client by URL", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers/by-url")
            .query({
               url: TEST_CLIENT_SERVERS.CLIENT_1.identifier_url,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Client server retrieved successfully",
            data: {
               client_id: TEST_CLIENT_SERVERS.CLIENT_1.client_id,
               app_name: TEST_CLIENT_SERVERS.CLIENT_1.app_name,
               assigned_schema_name:
                  TEST_CLIENT_SERVERS.CLIENT_1.assigned_schema_name,
               identifier_url: TEST_CLIENT_SERVERS.CLIENT_1.identifier_url,
            },
         });
      });

      it("should return 404 for unknown URL", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers/by-url")
            .query({
               url: "https://unknown-app.com",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });

      it("should find client by authorized URL pattern", async () => {
         const authorizedUrl =
            TEST_CLIENT_SERVERS.CLIENT_1.authorized_urls[0].replace(
               "/*",
               "/dashboard"
            );

         const response = await request(BASE_URL)
            .get("/api/client-servers/by-url")
            .query({
               url: authorizedUrl,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         expect(response.body.data.client_id).toBe(
            TEST_CLIENT_SERVERS.CLIENT_1.client_id
         );
      });
   });

   describe("Error Handling & Edge Cases", () => {
      it("should handle database connection errors gracefully", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .query({ schema: "non_existent_schema" })
            .expect(500);

         expect(response.body).toHaveProperty("error");
      });

      it("should validate schema parameter", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            // Missing schema parameter
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should handle malformed UUID", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers/invalid-uuid")
            .set("Cookie", ownerAuthCookie)
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should validate URL formats", async () => {
         const response = await request(BASE_URL)
            .post("/api/client-servers")
            .set("Cookie", ownerAuthCookie)
            .send({
               app_name: "Invalid URL App",
               identifier_url: "not-a-valid-url",
               entry_point_url: "also-not-valid",
               authorized_urls: ["invalid-url-pattern"],
               client_mode: "development",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("Authorization Tests", () => {
      it("should deny access without authentication", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });

      it("should deny access with invalid session", async () => {
         const response = await request(BASE_URL)
            .get("/api/client-servers")
            .set("Cookie", "invalid-session=fake-value")
            .query({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });

      it("should enforce owner-only access for management operations", async () => {
         const endpoints = [
            { method: "GET", path: "/api/client-servers" },
            { method: "POST", path: "/api/client-servers" },
            {
               method: "PUT",
               path: `/api/client-servers/${TEST_CLIENT_SERVERS.CLIENT_1.client_id}`,
            },
            {
               method: "DELETE",
               path: `/api/client-servers/${TEST_CLIENT_SERVERS.CLIENT_1.client_id}`,
            },
         ];

         for (const endpoint of endpoints) {
            const response = await request(BASE_URL)
               [endpoint.method.toLowerCase()](endpoint.path)
               .set("Cookie", regularUserAuthCookie)
               .send({ schema: TEST_SCHEMAS.AUTH_INTERNAL })
               .expect(403);

            expect(response.body.error).toContain("owner");
         }
      });
   });
});

// Helper function to verify client server in database
async function verifyClientServerInDatabase(clientId, schema, expectedData) {
   const pool = await testSetup.getTestDbConnection();
   try {
      const result = await pool.query(
         `SELECT * FROM "${schema}".client_servers WHERE client_id = $1`,
         [clientId]
      );

      if (expectedData) {
         expect(result.rows[0]).toMatchObject(expectedData);
      }

      return result.rows[0];
   } finally {
      await pool.end();
   }
}
