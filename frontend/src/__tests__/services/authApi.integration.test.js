import { describe, it, expect, beforeEach } from "vitest";
import authApi from "../../services/authApi";

// Assuming the backend is running at http://localhost:3001
// and VITE_BACKEND_URL is set accordingly in your .env or Vite config
// For these tests, authApi will use its configured BACKEND_URL.

describe("authApi Integration Tests", () => {
   // Helper to generate unique email for each test run to avoid conflicts
   const generateUniqueEmail = () => `testuser_${Date.now()}@example.com`;
   const generateUniqueName = () => `Test User ${Date.now()}`;

   describe("register", () => {
      it("should successfully register a new Auth System Owner", async () => {
         const uniqueEmail = generateUniqueEmail();
         const credentials = {
            name: generateUniqueName(),
            email: uniqueEmail,
            password: "StrongPassword123!",
            role: "owner", // or 'admin' depending on your backend setup for owners
         };
         const refererUrl = "http://localhost:3000/test-referer"; // Mock referer

         try {
            const response = await authApi.register(credentials, refererUrl);
            expect(response.success).toBe(true);
            expect(response.message).toBe("Registration successful"); // Adjust if backend message differs
            // Backend might return the user object or session info
            expect(response.data).toBeDefined();
            if (response.data && response.data.user) {
               expect(response.data.user.email).toBe(uniqueEmail);
               expect(response.data.user.name).toBe(credentials.name);
               expect(response.data.user.role).toBe(credentials.role);
            }
         } catch (error) {
            // This catch block is for unexpected errors in the test itself or authApi
            console.error("Test Error during registration:", error);
            throw error; // Fail the test
         }
      });

      it("should fail to register with an existing email", async () => {
         const existingEmail = generateUniqueEmail();
         const initialCredentials = {
            name: "Existing User",
            email: existingEmail,
            password: "Password123!",
            role: "owner",
         };
         const refererUrl = "http://localhost:3000/test-referer";

         // First, register a user
         await authApi.register(initialCredentials, refererUrl);

         // Then, attempt to register again with the same email
         const duplicateCredentials = {
            name: "Another User",
            email: existingEmail, // Same email
            password: "Password456!",
            role: "user",
         };

         const response = await authApi.register(
            duplicateCredentials,
            refererUrl
         );
         expect(response.success).toBe(false);
         // The exact error message depends on your backend implementation
         expect(response.message).toContain("already exists"); // Or similar
      });

      it("should fail to register with a weak password", async () => {
         const credentials = {
            name: generateUniqueName(),
            email: generateUniqueEmail(),
            password: "weak",
            role: "user",
         };
         const refererUrl = "http://localhost:3000/test-referer";
         const response = await authApi.register(credentials, refererUrl);
         expect(response.success).toBe(false);
         // The exact error message depends on your backend validation
         expect(response.message).toContain("Password is not strong enough");
      });
   });

   describe("login", () => {
      let testUserEmail;
      let testUserPassword;
      let testUserName;

      beforeEach(async () => {
         testUserEmail = generateUniqueEmail();
         testUserPassword = "LoginPassword123!";
         testUserName = generateUniqueName();
         const credentials = {
            name: testUserName,
            email: testUserEmail,
            password: testUserPassword,
            role: "owner",
         };
         const refererUrl = "http://localhost:3000/test-referer";
         // Ensure user exists for login tests
         const regResponse = await authApi.register(credentials, refererUrl);
         if (!regResponse.success) {
            console.error(
               "Failed to register user for login test:",
               regResponse
            );
            // This might indicate the backend issue is preventing successful registration
            // or a problem with the registration test itself.
         }
         // If the backend error ClientServerOperations is not defined occurs,
         // regResponse.success might be false or the structure might be unexpected.
         // The test will likely fail here if the backend bug is present.
         expect(
            regResponse.success,
            `Pre-test registration failed: ${regResponse.message}`
         ).toBe(true);
      });

      it("should successfully log in an existing user", async () => {
         const credentials = {
            email: testUserEmail,
            password: testUserPassword,
         };
         const refererUrl = "http://localhost:3000/test-referer";

         const response = await authApi.login(credentials, refererUrl);
         expect(response.success).toBe(true);
         expect(response.message).toBe("Login successful"); // Adjust if backend message differs
         expect(response.data).toBeDefined();
         expect(response.data.user).toBeDefined();
         expect(response.data.user.email).toBe(testUserEmail);
         expect(response.data.user.name).toBe(testUserName);
         // Backend should also return session details (e.g., token, cookie details if applicable)
         // For a session cookie, the browser (or test environment http client) would handle it.
         // The API response might just confirm success and user details.
      });

      it("should fail to log in with an incorrect password", async () => {
         const credentials = {
            email: testUserEmail,
            password: "WrongPassword123!",
         };
         const refererUrl = "http://localhost:3000/test-referer";

         const response = await authApi.login(credentials, refererUrl);
         expect(response.success).toBe(false);
         // The exact error message depends on your backend
         expect(response.message).toMatch(
            /incorrect password|invalid credentials/i
         );
      });

      it("should fail to log in a non-existent user", async () => {
         const credentials = {
            email: "nonexistent@example.com",
            password: "SomePassword123!",
         };
         const refererUrl = "http://localhost:3000/test-referer";

         const response = await authApi.login(credentials, refererUrl);
         expect(response.success).toBe(false);
         // The exact error message depends on your backend
         expect(response.message).toMatch(
            /user not found|invalid credentials/i
         );
      });
   });

   describe("logout", () => {
      beforeEach(async () => {
         // Ensure a user is logged in before testing logout
         const email = generateUniqueEmail();
         const password = "LogoutPassword123!";
         await authApi.register(
            { name: generateUniqueName(), email, password, role: "user" },
            "http://localhost:3000/test-referer"
         );
         const loginResponse = await authApi.login(
            { email, password },
            "http://localhost:3000/test-referer"
         );
         expect(
            loginResponse.success,
            `Pre-test login failed: ${loginResponse.message}`
         ).toBe(true);
      });

      it("should successfully log out an authenticated user", async () => {
         const response = await authApi.logout();
         expect(response.success).toBe(true);
         expect(response.message).toBe("Logout successful"); // Adjust if backend message differs
         // After logout, session-related data in response might be minimal or null
      });
   });
});
