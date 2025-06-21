/**
 * Integration Tests for Session Service
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

describe("Session Service Integration Tests", () => {
   let authCookie;
   let testUserId;

   beforeAll(async () => {
      console.log("🚀 Setting up session integration tests...");

      // Wait for database to be ready
      await testSetup.waitForDatabase();

      // Setup test schemas and seed data
      await testSetup.setupTestSchemas();
      await testSetup.seedTestData();

      console.log("✅ Session integration test setup complete");
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

      // Login to get auth cookie and user ID for tests
      const loginResponse = await request(BASE_URL)
         .post("/api/auth/login")
         .send({
            email: TEST_USERS.ADMIN_USER.email,
            password: TEST_USERS.ADMIN_USER.password,
            schema: TEST_SCHEMAS.CLIENT_TEST,
         })
         .expect(200);

      authCookie = loginResponse.headers["set-cookie"];
      testUserId = loginResponse.body.sessionUpdate.userId;
   });

   afterAll(async () => {
      console.log("🧹 Cleaning up session integration tests...");
      await testSetup.cleanTestData();
      await testSetup.teardownTestSchemas();
      console.log("✅ Session integration test cleanup complete");
   });

   describe("POST /api/sessions", () => {
      it("TC-SESSION-CREATE-001: Valid session creation", async () => {
         const sessionData = {
            userId: testUserId,
            ipAddress: "192.168.1.100",
            userAgent: "Mozilla/5.0 (Test Browser)",
         };

         const response = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               ...sessionData,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         expect(response.body).toMatchObject({
            message: "Session created successfully",
            data: {
               id: expect.any(String),
               session_id: expect.any(String),
               user_id: sessionData.userId,
               ip_address: sessionData.ipAddress,
               user_agent: sessionData.userAgent,
               expires_at: expect.any(String),
               created_at: expect.any(String),
            },
         });

         // Verify session was created in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions WHERE session_id = $1`,
               [response.body.data.session_id]
            );
            expect(result.rows).toHaveLength(1);
            expect(result.rows[0].user_id).toBe(sessionData.userId);
            expect(result.rows[0].ip_address).toBe(sessionData.ipAddress);
         } finally {
            await pool.end();
         }
      });

      it("should create session with default expiry", async () => {
         const sessionData = {
            userId: testUserId,
         };

         const response = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               ...sessionData,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         expect(response.body.data.expires_at).toBeDefined();

         // Should expire in ~24 hours
         const expiresAt = new Date(response.body.data.expires_at);
         const now = new Date();
         const hoursDiff = (expiresAt - now) / (1000 * 60 * 60);
         expect(hoursDiff).toBeGreaterThan(23);
         expect(hoursDiff).toBeLessThan(25);
      });

      it("should return 400 for missing userId", async () => {
         const response = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               // Missing userId
            })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("GET /api/sessions", () => {
      let testSessions;

      beforeEach(async () => {
         // Create test sessions
         testSessions = [];
         for (let i = 0; i < 3; i++) {
            const createResponse = await request(BASE_URL)
               .post("/api/sessions")
               .set("Cookie", authCookie)
               .send({
                  userId: testUserId,
                  ipAddress: `192.168.1.${100 + i}`,
                  userAgent: `Test Browser ${i + 1}`,
                  schema: TEST_SCHEMAS.CLIENT_TEST,
               })
               .expect(201);

            testSessions.push(createResponse.body.data);
         }
      });

      it("TC-SESSION-GETALL-001: Get all sessions", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Sessions retrieved successfully",
            data: expect.arrayContaining([
               expect.objectContaining({
                  id: expect.any(String),
                  session_id: expect.any(String),
                  user_id: expect.any(String),
                  created_at: expect.any(String),
               }),
            ]),
         });

         // Should include our test sessions plus the login session
         expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      });

      it("TC-SESSION-GETBYUSER-001: Get sessions by user ID", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               userId: testUserId,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Sessions retrieved successfully",
            data: expect.arrayContaining([
               expect.objectContaining({
                  user_id: testUserId,
               }),
            ]),
         });

         // All returned sessions should belong to the test user
         response.body.data.forEach((session) => {
            expect(session.user_id).toBe(testUserId);
         });
      });

      it("should return empty array for user with no sessions", async () => {
         // Create a user with no sessions
         const newUserResponse = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "No Sessions User",
               email: "nosessions@example.com",
               password: "Password123!",
               role: "user",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               userId: newUserResponse.body.data.id,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Sessions retrieved successfully",
            data: [],
         });
      });
   });

   describe("GET /api/sessions/:sessionId", () => {
      let testSession;

      beforeEach(async () => {
         // Create a test session
         const createResponse = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               userId: testUserId,
               ipAddress: "192.168.1.200",
               userAgent: "Test Browser for Get",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         testSession = createResponse.body.data;
      });

      it("TC-SESSION-GETID-001: Get session by session ID", async () => {
         const response = await request(BASE_URL)
            .get(`/api/sessions/${testSession.session_id}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Session retrieved successfully",
            data: {
               id: testSession.id,
               session_id: testSession.session_id,
               user_id: testSession.user_id,
               ip_address: testSession.ip_address,
               user_agent: testSession.user_agent,
               expires_at: testSession.expires_at,
            },
         });
      });

      it("should return 404 for non-existent session", async () => {
         const fakeSessionId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .get(`/api/sessions/${fakeSessionId}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("PUT /api/sessions/:sessionId", () => {
      let testSession;

      beforeEach(async () => {
         // Create a test session
         const createResponse = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               userId: testUserId,
               ipAddress: "192.168.1.300",
               userAgent: "Test Browser for Update",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         testSession = createResponse.body.data;
      });

      it("TC-SESSION-UPDATE-001: Valid session update", async () => {
         const newExpiresAt = new Date();
         newExpiresAt.setHours(newExpiresAt.getHours() + 48); // 48 hours from now

         const response = await request(BASE_URL)
            .put(`/api/sessions/${testSession.session_id}`)
            .set("Cookie", authCookie)
            .send({
               expiresAt: newExpiresAt.toISOString(),
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Session updated successfully",
            data: expect.any(Object),
         });

         // Verify update in database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions WHERE session_id = $1`,
               [testSession.session_id]
            );

            const updatedExpiresAt = new Date(result.rows[0].expires_at);
            const expectedExpiresAt = new Date(newExpiresAt);

            // Allow for small time differences (within 1 minute)
            const timeDiff = Math.abs(updatedExpiresAt - expectedExpiresAt);
            expect(timeDiff).toBeLessThan(60000); // 60 seconds
         } finally {
            await pool.end();
         }
      });

      it("should return 404 for non-existent session update", async () => {
         const fakeSessionId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .put(`/api/sessions/${fakeSessionId}`)
            .set("Cookie", authCookie)
            .send({
               expiresAt: new Date().toISOString(),
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("DELETE /api/sessions/:sessionId", () => {
      let testSession;

      beforeEach(async () => {
         // Create a test session
         const createResponse = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               userId: testUserId,
               ipAddress: "192.168.1.400",
               userAgent: "Test Browser for Delete",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         testSession = createResponse.body.data;
      });

      it("TC-SESSION-DELETE-001: Valid session deletion", async () => {
         const response = await request(BASE_URL)
            .delete(`/api/sessions/${testSession.session_id}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Session deleted successfully",
            data: expect.any(Object),
         });

         // Verify session was deleted from database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions WHERE session_id = $1`,
               [testSession.session_id]
            );
            expect(result.rows).toHaveLength(0);
         } finally {
            await pool.end();
         }
      });

      it("should return 404 for non-existent session deletion", async () => {
         const fakeSessionId = "123e4567-e89b-12d3-a456-426614174000";

         const response = await request(BASE_URL)
            .delete(`/api/sessions/${fakeSessionId}`)
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(404);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("DELETE /api/sessions", () => {
      beforeEach(async () => {
         // Create multiple test sessions
         for (let i = 0; i < 5; i++) {
            await request(BASE_URL)
               .post("/api/sessions")
               .set("Cookie", authCookie)
               .send({
                  userId: testUserId,
                  ipAddress: `192.168.1.${500 + i}`,
                  userAgent: `Test Browser ${i + 1}`,
                  schema: TEST_SCHEMAS.CLIENT_TEST,
               })
               .expect(201);
         }
      });

      it("TC-SESSION-DELETEALL-001: Delete all sessions", async () => {
         const response = await request(BASE_URL)
            .delete("/api/sessions")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "All sessions deleted successfully",
            data: expect.any(Object),
         });

         // Verify all sessions were deleted from database
         const pool = await testSetup.getTestDbConnection();
         try {
            const result = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions`
            );
            expect(result.rows).toHaveLength(0);
         } finally {
            await pool.end();
         }
      });

      it("TC-SESSION-DELETEUSER-001: Delete all sessions for user", async () => {
         // Create another user with sessions
         const anotherUserResponse = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "Another User",
               email: "anotheruser@example.com",
               password: "Password123!",
               role: "user",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         const anotherUserId = anotherUserResponse.body.data.id;

         // Create sessions for another user
         await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               userId: anotherUserId,
               ipAddress: "192.168.1.600",
               userAgent: "Another User Browser",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         const response = await request(BASE_URL)
            .delete("/api/sessions")
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               userId: testUserId,
            })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Sessions deleted successfully",
            data: expect.any(Object),
         });

         // Verify only test user's sessions were deleted
         const pool = await testSetup.getTestDbConnection();
         try {
            const userSessionsResult = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions WHERE user_id = $1`,
               [testUserId]
            );
            expect(userSessionsResult.rows).toHaveLength(0);

            const otherSessionsResult = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions WHERE user_id = $1`,
               [anotherUserId]
            );
            expect(otherSessionsResult.rows.length).toBeGreaterThan(0);
         } finally {
            await pool.end();
         }
      });
   });

   describe("DELETE /api/sessions/expired", () => {
      beforeEach(async () => {
         // Create expired and active sessions
         const pool = await testSetup.getTestDbConnection();
         try {
            // Create expired session
            const expiredDate = new Date();
            expiredDate.setHours(expiredDate.getHours() - 1); // 1 hour ago

            await pool.query(
               `INSERT INTO "${TEST_SCHEMAS.CLIENT_TEST}".sessions 
                (id, user_id, session_id, ip_address, user_agent, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6)`,
               [
                  "expired-session-id",
                  testUserId,
                  "expired-session-uuid",
                  "192.168.1.700",
                  "Expired Browser",
                  expiredDate.toISOString(),
               ]
            );

            // Create active session
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

            await pool.query(
               `INSERT INTO "${TEST_SCHEMAS.CLIENT_TEST}".sessions 
                (id, user_id, session_id, ip_address, user_agent, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6)`,
               [
                  "active-session-id",
                  testUserId,
                  "active-session-uuid",
                  "192.168.1.800",
                  "Active Browser",
                  futureDate.toISOString(),
               ]
            );
         } finally {
            await pool.end();
         }
      });

      it("TC-SESSION-DELETEEXP-001: Delete expired sessions", async () => {
         const response = await request(BASE_URL)
            .delete("/api/sessions/expired")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(200);

         expect(response.body).toMatchObject({
            message: "Expired sessions deleted successfully",
            data: expect.any(Object),
         });

         // Verify only expired sessions were deleted
         const pool = await testSetup.getTestDbConnection();
         try {
            const allSessionsResult = await pool.query(
               `SELECT * FROM "${TEST_SCHEMAS.CLIENT_TEST}".sessions`
            );

            const activeSessions = allSessionsResult.rows.filter(
               (session) => new Date(session.expires_at) > new Date()
            );
            const expiredSessions = allSessionsResult.rows.filter(
               (session) => new Date(session.expires_at) <= new Date()
            );

            expect(activeSessions.length).toBeGreaterThan(0);
            expect(expiredSessions).toHaveLength(0);
         } finally {
            await pool.end();
         }
      });
   });

   describe("Error Handling & Edge Cases", () => {
      it("should handle database connection errors gracefully", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", authCookie)
            .query({ schema: "non_existent_schema" })
            .expect(500);

         expect(response.body).toHaveProperty("error");
      });

      it("should validate schema parameter", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", authCookie)
            // Missing schema parameter
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should handle malformed UUID", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions/invalid-uuid")
            .set("Cookie", authCookie)
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });

      it("should validate date formats", async () => {
         // Create a test session first
         const createResponse = await request(BASE_URL)
            .post("/api/sessions")
            .set("Cookie", authCookie)
            .send({
               userId: testUserId,
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         const response = await request(BASE_URL)
            .put(`/api/sessions/${createResponse.body.data.session_id}`)
            .set("Cookie", authCookie)
            .send({
               expiresAt: "invalid-date-format",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(400);

         expect(response.body.error).toBeDefined();
      });
   });

   describe("Authorization Tests", () => {
      it("should deny access without authentication", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });

      it("should deny access with invalid session", async () => {
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", "invalid-session=fake-value")
            .query({ schema: TEST_SCHEMAS.CLIENT_TEST })
            .expect(401);

         expect(response.body.error).toBeDefined();
      });

      it("should only allow users to access their own sessions", async () => {
         // Create another user
         const anotherUserResponse = await request(BASE_URL)
            .post("/api/users")
            .set("Cookie", authCookie)
            .send({
               name: "Another User",
               email: "another2@example.com",
               password: "Password123!",
               role: "user",
               schema: TEST_SCHEMAS.CLIENT_TEST,
            })
            .expect(201);

         const anotherUserId = anotherUserResponse.body.data.id;

         // Try to access another user's sessions (should be filtered by session user)
         const response = await request(BASE_URL)
            .get("/api/sessions")
            .set("Cookie", authCookie)
            .query({
               schema: TEST_SCHEMAS.CLIENT_TEST,
               userId: anotherUserId,
            })
            .expect(403); // Should be forbidden or filtered

         expect(response.body.error).toBeDefined();
      });
   });
});

// Helper function to verify session in database
async function verifySessionInDatabase(sessionId, schema, expectedData) {
   const pool = await testSetup.getTestDbConnection();
   try {
      const result = await pool.query(
         `SELECT * FROM "${schema}".sessions WHERE session_id = $1`,
         [sessionId]
      );

      if (expectedData) {
         expect(result.rows[0]).toMatchObject(expectedData);
      }

      return result.rows[0];
   } finally {
      await pool.end();
   }
}
