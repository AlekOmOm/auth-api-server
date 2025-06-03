/**
 * Integration Tests for Auth Service
 * Tests actual HTTP endpoints with real database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import testSetup, {
   TEST_SCHEMAS,
   TEST_USERS,
   TEST_CLIENT_SERVERS,
} from "./setup/testSetup.js";

// Import your actual Express app
// Note: Adjust this import path to match your server setup
let app;
let server;

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3001";

describe("Auth Service Integration Tests", () => {
   beforeAll(async () => {
      console.log("🚀 Setting up integration tests...");

      // Wait for database to be ready
      await testSetup.waitForDatabase();

      // Setup test schemas and seed data
      await testSetup.setupTestSchemas();
      await testSetup.seedTestData();

      console.log("✅ Integration test setup complete");
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
   });

   afterAll(async () => {
      console.log("🧹 Cleaning up integration tests...");
      await testSetup.cleanTestData();
      await testSetup.teardownTestSchemas();
      console.log("✅ Integration test cleanup complete");
   });

   describe("POST /api/auth/login", () => {
      it("TC-AUTH-LOGIN-001: Valid credentials - regular user in client schema", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: TEST_USERS.REGULAR_USER.email,
               password: TEST_USERS.REGULAR_USER.password,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Login successful",
            data: {
               name: TEST_USERS.REGULAR_USER.name,
               email: TEST_USERS.REGULAR_USER.email,
               role: TEST_USERS.REGULAR_USER.role,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            },
         });

         // Should not contain password
         expect(response.body.data).not.toHaveProperty("password");
         expect(response.body.data).not.toHaveProperty("password_hash");

         // Should have session update
         expect(response.body.sessionUpdate).toMatchObject({
            userId: expect.any(String),
            role: TEST_USERS.REGULAR_USER.role,
         });
      });

      it("TC-AUTH-LOGIN-002: Valid credentials - owner user in auth_internal", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: TEST_USERS.OWNER_USER.email,
               password: TEST_USERS.OWNER_USER.password,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Login successful",
            data: {
               name: TEST_USERS.OWNER_USER.name,
               email: TEST_USERS.OWNER_USER.email,
               role: "owner", // Should be detected as owner due to client servers
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            },
         });

         // Should have owner metadata
         expect(response.body.sessionUpdate.poolMetadata).toMatchObject({
            user_role: "owner",
            owned_clients: expect.any(Number),
         });
      });

      it("TC-AUTH-LOGIN-E001: Missing credentials", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(400);

         expect(response.body.error).toContain(
            "Email and password are required"
         );
      });

      it("TC-AUTH-LOGIN-E002: Invalid email", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: "nonexistent@example.com",
               password: "anypassword",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(401);

         expect(response.body.error).toContain("Invalid credentials");
      });

      it("TC-AUTH-LOGIN-E003: Invalid password", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: TEST_USERS.REGULAR_USER.email,
               password: "wrongpassword",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(401);

         expect(response.body.error).toContain("Invalid credentials");
      });
   });

   describe("POST /api/auth/logout", () => {
      let authCookie;

      beforeEach(async () => {
         // Login first to get session
         const loginResponse = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: TEST_USERS.REGULAR_USER.email,
               password: TEST_USERS.REGULAR_USER.password,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(200);

         authCookie = loginResponse.headers["set-cookie"];
      });

      it("TC-AUTH-LOGOUT-001: Valid user logout", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/logout")
            .set("Cookie", authCookie)
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Logout successful",
         });

         // Session should be cleared
         expect(response.headers["set-cookie"]).toBeDefined();
      });

      it("TC-AUTH-LOGOUT-E001: No active session", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/logout")
            .expect(401);

         expect(response.body.error).toContain("No active session");
      });
   });

   describe("POST /api/auth/register", () => {
      it("TC-AUTH-REGISTER-001: Valid client user registration", async () => {
         const newUser = {
            name: "New Client User",
            email: "newclient@example.com",
            password: "NewPassword123!",
            userType: "client",
         };

         const response = await request(BASE_URL)
            .post("/api/auth/register")
            .send({
               ...newUser,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         expect(response.body).toMatchObject({
            message: "Registration successful",
            data: {
               userType: "client",
               schema: TEST_SCHEMAS.CLIENT_TEST,
               role: "user",
            },
         });

         // Verify user was created in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".users WHERE email = $1`,
               [newUser.email]
            );
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].name).toBe(newUser.name);
         } finally {
            await pool.end();
         }
      });

      it("TC-AUTH-REGISTER-002: Valid auth user registration", async () => {
         const newOwner = {
            name: "New Owner",
            email: "newowner@example.com",
            password: "OwnerPassword123!",
            userType: "auth",
         };

         const response = await request(BASE_URL)
            .post("/api/auth/register")
            .send(newOwner)
            .expect(201);

         expect(response.body).toMatchObject({
            message: "Registration successful",
            data: {
               userType: "auth",
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
               role: "owner",
            },
         });

         // Verify user was created in auth_internal schema
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.AUTH_INTERNAL}".users WHERE email = $1`,
               [newOwner.email]
            );
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].role).toBe("owner");
         } finally {
            await pool.end();
         }
      });

      it("TC-AUTH-REGISTER-E001: Missing required fields", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/register")
            .send({
               name: "Test User",
               // Missing email and password
            })
            .expect(400);

         expect(response.body.error).toContain(
            "Name, email, and password are required"
         );
      });

      it("TC-AUTH-REGISTER-E002: Duplicate email", async () => {
         const response = await request(BASE_URL)
            .post("/api/auth/register")
            .send({
               name: "Duplicate User",
               email: TEST_USERS.REGULAR_USER.email, // Already exists
               password: "Password123!",
               userType: "client",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(409);

         expect(response.body.error).toContain(
            "User with this email already exists"
         );
      });
   });

   describe("GET /api/auth/user - Current User", () => {
      let authCookie;

      beforeEach(async () => {
         // Login first to get session
         const loginResponse = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: TEST_USERS.OWNER_USER.email,
               password: TEST_USERS.OWNER_USER.password,
               schema: TEST_SCHEMAS.AUTH_INTERNAL,
            })
            .expect(200);

         authCookie = loginResponse.headers["set-cookie"];
      });

      it("should retrieve current user with session role", async () => {
         const response = await request(BASE_URL)
            .get("/api/auth/user")
            .set("Cookie", authCookie)
            .expect(200);

         expect(response.body).toMatchObject({
            message: expect.any(String),
            data: {
               name: TEST_USERS.OWNER_USER.name,
               email: TEST_USERS.OWNER_USER.email,
               role: "owner", // Session role
            },
         });

         // Should not contain password
         expect(response.body.data).not.toHaveProperty("password");
         expect(response.body.data).not.toHaveProperty("password_hash");
      });

      it("should return 401 when not authenticated", async () => {
         const response = await request(BASE_URL)
            .get("/api/auth/user")
            .expect(401);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("Error Handling", () => {
      it("should handle database connection errors gracefully", async () => {
         // This test might need to be adjusted based on your error handling
         const response = await request(BASE_URL)
            .post("/api/auth/login")
            .send({
               email: "test@example.com",
               password: "password",
               schema: "non_existent_schema",
            })
            .expect(500);

         expect(response.body).toHaveProperty("error");
      });
   });
});

// Helper function to verify session in database
async function verifySessionInDatabase(userId, schema) {
   const pool = await testSetup.getTestDbConnection();
   try {
      const result = await pool.query(
         `SELECT * FROM "${schema}".sessions WHERE user_id = $1`,
         [userId]
      );
      return result.rows;
   } finally {
      await pool.end();
   }
}
