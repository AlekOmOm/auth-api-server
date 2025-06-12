/**
 * Main Integration Test Runner
 *
 * This runs all frontend integration tests against the Docker backend
 * Make sure Docker services are running before executing these tests
 */

import { describe, it, expect, beforeAll } from "vitest";

const BACKEND_BASE_URL = "http://localhost:3001";

describe("Frontend Integration Test Suite", () => {
   beforeAll(async () => {
      console.log("🚀 Starting Frontend Integration Tests");
      console.log("📍 Backend URL:", BACKEND_BASE_URL);
      console.log("🐳 Make sure Docker services are running!");

      // Check if backend is accessible
      try {
         const response = await fetch(`${BACKEND_BASE_URL}/api/auth/session`, {
            credentials: "include",
         });
         console.log("✅ Backend is accessible, status:", response.status);

         if (response.status >= 500) {
            throw new Error(`Backend server error: ${response.status}`);
         }
      } catch (error) {
         console.error("❌ Backend not accessible:", error.message);
         console.error("🔧 Please ensure Docker services are running:");
         console.error("   make run");
         console.error("   OR");
         console.error("   docker-compose up");
         throw new Error(
            "Backend not accessible. Please start Docker services."
         );
      }
   }, 15000);

   it("should have backend services running and accessible", async () => {
      console.log("🧪 Testing backend accessibility...");

      // Test main endpoints
      const endpoints = [
         "/api/auth/session",
         "/api/clientServer/user/clients",
         "/api/owner/stats",
      ];

      for (const endpoint of endpoints) {
         try {
            const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
               credentials: "include",
            });
            console.log(`📍 ${endpoint}: ${response.status}`);
            expect(response.status).toBeLessThan(500);
         } catch (error) {
            console.error(`❌ Failed to reach ${endpoint}:`, error.message);
            throw error;
         }
      }

      console.log("✅ All backend endpoints accessible");
   });

   it("should verify Docker environment", async () => {
      console.log("🧪 Verifying Docker environment...");

      // Check if we can reach the database through the backend
      try {
         const response = await fetch(`${BACKEND_BASE_URL}/api/auth/session`, {
            credentials: "include",
         });

         console.log(
            "📍 Database connectivity (via backend):",
            response.status
         );

         // Any response under 500 means backend can connect to database
         expect(response.status).toBeLessThan(500);

         console.log("✅ Docker environment verified");
      } catch (error) {
         console.error("❌ Docker environment issue:", error.message);
         throw error;
      }
   });
});

/**
 * Test Instructions
 *
 * To run these integration tests:
 *
 * 1. Start Docker services:
 *    make run
 *    (or docker-compose up)
 *
 * 2. Wait for services to be ready:
 *    - Frontend: http://localhost:3000
 *    - Backend: http://localhost:3001
 *    - Database: localhost:5432
 *
 * 3. Run the tests:
 *    npm test
 *
 * 4. Run specific test files:
 *    npm test -- api/authApi.integration.test.js
 *    npm test -- stores/authStore.integration.test.js
 *    npm test -- util/sessionHelper.integration.test.js
 *
 * 5. Run tests in watch mode:
 *    npm run test:watch
 */

export const testConfig = {
   backendUrl: BACKEND_BASE_URL,
   timeout: 15000,
   retryAttempts: 3,
};
