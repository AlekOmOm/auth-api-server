/**
 * Integration Tests for User Service
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

describe("User Service Integration Tests", () => {
   let authCookie;

   beforeAll(async () => {
      console.log("🚀 Setting up user integration tests...");

      // Wait for database to be ready
      await testSetup.waitForDatabase();

      // Setup test schemas and seed data
      await testSetup.setupTestSchemas();
      await testSetup.seedTestData();

      console.log("✅ User integration test setup complete");
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

      // Login to get auth cookie for protected endpoints
      const loginResponse = await request(BASE_URL)
         .post("/api/auth/login")
         .send({
            email: TEST_USERS.ADMIN_USER.email,
            password: TEST_USERS.ADMIN_USER.password,
            schema: TEST_SCHEMAS.CLIENT_TEST,
         })
         .expect(200);

      authCookie = loginResponse.headers["set-cookie"];
   });

   afterAll(async () => {
      console.log("🧹 Cleaning up user integration tests...");
      await testSetup.cleanTestData();
      await testSetup.teardownTestSchemas();
      console.log("✅ User integration test cleanup complete");
   });

   describe("GET /api/users", () => {
      it("TC-USER-GETALL-001: Retrieve all users", async () => {
         const response = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Users retrieved successfully",
            data: expect.arrayContaining([
               expect.objectContaining({
                  id: expect.any(String),
                  name: expect.any(String),
                  email: expect.any(String),
                  role: expect.any(String),
                  created_at: expect.any(String),
               }),
            ]),
         });

         // Should not contain passwords
         response.body.data.forEach((user) => {
            expect(user).not.toHaveProperty("password");
            expect(user).not.toHaveProperty("password_hash");
         });

         // Should have at least our test users
         expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      });

      it("TC-USER-GETALL-002: Empty user list in new schema", async () => {
         // Create a temporary empty schema for this test
         const pool = await testSetup.getTestDbConnection();
         const emptySchema = "test_empty_schema";

         try {
            await pool.query(`CREATE SCHEMA IF NOT EXISTS "${emptySchema}"`);
            await pool.query(`
               CREATE TABLE IF NOT EXISTS "${emptySchema}".users (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  name VARCHAR(255) NOT NULL,
                  email VARCHAR(255) UNIQUE NOT NULL,
                  password_hash VARCHAR(255) NOT NULL,
                  role VARCHAR(50) DEFAULT 'user',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
               )
            `);

            const response = await request(BASE_URL)
               .get("/api/users")
               .set("Cookie", authCookie)
               .query({ schema: emptySchema })
               .expect(200);

            expect(response.body).toMatchObject({
               message: "Users retrieved successfully",
               data: [],
            });

            // Cleanup
            await pool.query(`DROP SCHEMA IF EXISTS "${emptySchema}" CASCADE`);
         } finally {
            await pool.end();
         }
      });

      it("should return 401 when not authenticated", async () => {
         const response = await request(BASE_URL)
            .get("/api/users")
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("GET /api/users/:id", () => {
      it("TC-USER-GET-001: Get user by ID", async () => {
         // First get all users to find a valid ID
         const usersResponse = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         const userId = usersResponse.body.data[0].id;

         const response = await request(BASE_URL)
            .get(`/api/users/${userId}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "User retrieved successfully",
            data: {
               id: userId,
               name: expect.any(String),
               email: expect.any(String),
               role: expect.any(String),
            },
         });

         // Should not contain password
         expect(response.body.data).not.toHaveProperty("password");
         expect(response.body.data).not.toHaveProperty("password_hash");
      });

      it("TC-USER-GET-002: Get user with login validation", async () => {
         // First get a user to find their ID
         const usersResponse = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         const testUser = usersResponse.body.data.find(
            (user) => user.email === TEST_USERS.REGULAR_USER.email
         );

         const response = await request(BASE_URL)
            .get(`/api/users/${testUser.id}`)
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               password: TEST_USERS.REGULAR_USER.password,
               validateLogin: true,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "User retrieved successfully",
            data: {
               id: testUser.id,
               name: TEST_USERS.REGULAR_USER.name,
               email: TEST_USERS.REGULAR_USER.email,
               role: TEST_USERS.REGULAR_USER.role,
            },
         });

         // Should not contain password even after validation
         expect(response.body.data).not.toHaveProperty("password");
         expect(response.body.data).not.toHaveProperty("password_hash");
      });

      it("TC-USER-GET-E001: Invalid credentials for login validation", async () => {
         const usersResponse = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         const userId = usersResponse.body.data[0].id;

         const response = await request(BASE_URL)
            .get(`/api/users/${userId}`)
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               password: "wrongPassword",
               validateLogin: true,
            })
            .expect(400);

         expect(response.body.error).toContain("password is incorrect");
      });

      it("should return 404 for non-existent user", async () => {
         const fakeId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .get(`/api/users/${fakeId}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("POST /api/users", () => {
      it("TC-USER-CREATE-001: Valid user creation", async () => {
         const newUser = {
            name: "New Test User",
            email: "newuser@example.com",
            password: "NewPassword123!",
            role: "user",
         };

         const response = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               ...newUser,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         expect(response.body).toMatchObject({
            message: "User created successfully",
            data: {
               id: expect.any(String),
               name: newUser.name,
               email: newUser.email,
               role: newUser.role,
               created_at: expect.any(String),
            },
         });

         // Should not contain password in response
         expect(response.body.data).not.toHaveProperty("password");
         expect(response.body.data).not.toHaveProperty("password_hash");

         // Verify user was created in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".users WHERE email = $1`,
               [newUser.email]
            );
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].name).toBe(newUser.name);
            expect(result.rows[0].role).toBe(newUser.role);
         } finally {
            await pool.end();
         }
      });

      it("should return 400 for missing required fields", async () => {
         const response = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "Incomplete User",
               schema: TEST_SCHEMAS.CLIENT_TEST,
               // Missing email and password
            })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should return 409 for duplicate email", async () => {
         const response = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "Duplicate User",
               email: TEST_USERS.REGULAR_USER.email, // Already exists
               password: "Password123!",
               role: "user",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(409);

         expect(response.body.error).toContain("already exists");
      });
   });

   describe("PUT /api/users/:id", () => {
      let userToUpdate;

      beforeEach(async () => {
         // Create a user to update
         const createResponse = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "User To Update",
               email: "updateme@example.com",
               password: "Password123!",
               role: "user",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         userToUpdate = createResponse.body.data;
      });

      it("TC-USER-UPDATE-001: Valid user update", async () => {
         const updateData = {
            name: "Updated User Name",
            role: "admin",
         };

         const response = await request(BASE_URL)
            .put(`/api/users/${userToUpdate.id}`)
            .set("Cookie", authCookie)
            .send({
               ...updateData,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "User updated successfully",
            data: {
               id: userToUpdate.id,
               name: updateData.name,
               email: userToUpdate.email, // Should remain unchanged
               role: updateData.role,
               updated_at: expect.any(String),
            },
         });

         // Verify update in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".users WHERE id = $1`,
               [userToUpdate.id]
            );
            expect(result.rows[0].name).toBe(updateData.name);
            expect(result.rows[0].role).toBe(updateData.role);
         } finally {
            await pool.end();
         }
      });

      it("should return 404 for non-existent user update", async () => {
         const fakeId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .put(`/api/users/${fakeId}`)
            .set("Cookie", authCookie)
            .send({
               name: "Updated Name",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("DELETE /api/users/:id", () => {
      let userToDelete;

      beforeEach(async () => {
         // Create a user to delete
         const createResponse = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "User To Delete",
               email: "deleteme@example.com",
               password: "Password123!",
               role: "user",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         userToDelete = createResponse.body.data;
      });

      it("TC-USER-DELETE-001: Valid user deletion", async () => {
         const response = await request(BASE_URL)
            .delete(`/api/users/${userToDelete.id}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "User deleted successfully",
            data: expect.any(Object),
         });

         // Verify user was deleted from database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".users WHERE id = $1`,
               [userToDelete.id]
            );
            expect(result.rows).toHaveLength(0);
         } finally {
            await pool.end();
         }
      });

      it("should return 404 for non-existent user deletion", async () => {
         const fakeId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .delete(`/api/users/${fakeId}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("GET /api/users/search", () => {
      it("should find user by name and email", async () => {
         const response = await request(BASE_URL)
            .get("/api/users/search")
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               name: TEST_USERS.REGULAR_USER.name,
               email: TEST_USERS.REGULAR_USER.email,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "User retrieved successfully",
            data: {
               name: TEST_USERS.REGULAR_USER.name,
               email: TEST_USERS.REGULAR_USER.email,
               role: TEST_USERS.REGULAR_USER.role,
            },
         });

         // Should not contain password
         expect(response.body.data).not.toHaveProperty("password");
         expect(response.body.data).not.toHaveProperty("password_hash");
      });

      it("should return 404 for non-existent user search", async () => {
         const response = await request(BASE_URL)
            .get("/api/users/search")
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               name: "Non Existent User",
               email: "nonexistent@example.com",
            })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("Error Handling & Edge Cases", () => {
      it("should handle database connection errors gracefully", async () => {
         const response = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", authCookie)
            .query({ schema: "non_existent_schema" })
            .expect(500);

         expect(response.body).toHaveProperty("error");
      });

      it("should validate schema parameter", async () => {
         const response = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", authCookie)
            // Missing schema parameter
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should handle malformed UUID", async () => {
         const response = await request(BASE_URL)
            .get("/api/users/invalid-uuid")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("Authorization Tests", () => {
      it("should deny access without authentication", async () => {
         const response = await request(BASE_URL)
            .get("/api/users")
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });

      it("should deny access with invalid session", async () => {
         const response = await request(BASE_URL)
            .get("/api/users")
            .set("Cookie", "invalid-session=fake-value")
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });
   });
});

// Helper function to verify user in database
async function verifyUserInDatabase(userId, schema, expectedData) {
   const pool = await testSetup.getTestDbConnection();
   try {
      const result = await pool.query(
         `SELECT * FROM "${schema}".users WHERE id = $1`,
         [userId]
      );

      if (expectedData) {
         expect(result.rows[0]).toMatchObject(expectedData);
      }

      return result.rows[0];
   } finally {
      await pool.end();
   }
}
