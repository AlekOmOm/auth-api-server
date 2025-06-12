import { describe, it, expect, beforeEach, vi } from "vitest";
import authService from "../../services/auth.js";
import { AuthError, ValidationError } from "../../middleware/errorHandler.js";
import { v4 as uuidv4 } from "uuid";

// Mock dependencies
vi.mock("uuid", () => ({
   v4: vi.fn(() => "mock-uuid-1234"),
}));

vi.mock("../../utils/request/session.js", () => ({
   getUserId: vi.fn((session) => session?.userId),
   getSession: vi.fn((session) => session),
}));

vi.mock("../../utils/authUtils.js", () => ({
   createSuccessResponse: vi.fn((message, data) => ({
      message,
      success: true,
      data,
   })),
   removePasswordFromUser: vi.fn((user) => {
      const { password, password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
   }),
}));

vi.mock("../../repo/repositories/userRepository.js", () => ({
   userRepo: {
      getUserByEmail: vi.fn(),
      getUser: vi.fn(),
      createUser: vi.fn(),
      createSession: vi.fn(),
      deleteSessionByUserId: vi.fn(),
      getSessions: vi.fn(),
   },
}));

vi.mock("../../repo/clientAppRepository.js", () => ({
   userRepo: {
      getUserByEmail: vi.fn(),
      getUser: vi.fn(),
      createUser: vi.fn(),
      createSession: vi.fn(),
      deleteSessionByUserId: vi.fn(),
      getSessions: vi.fn(),
   },
}));

// Define mocks for pools/auth.js BEFORE they are used in vi.mock
const mockAuthPoolQueryFn = vi.fn();
const mockGetAuthPoolFn = vi.fn(() =>
   Promise.resolve({ query: mockAuthPoolQueryFn })
);

vi.mock("../../repo/connection/pools/auth.js", () => ({
   default: (...args) => mockGetAuthPoolFn(...args),
}));

// Import mocked modules
import { userRepo as userAuthInternalRepo } from "../../repo/repositories/userRepository.js";
import { userRepo as userClientAppRepo } from "../../repo/clientAppRepository.js";

describe("authService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe("login", () => {
      const mockCredentials = {
         email: "test@test.com",
         password: "password123",
      };

      it("should login user successfully in auth_internal schema", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password_hash: "password123",
            role: "user",
         };

         userAuthInternalRepo.getUserByEmail.mockResolvedValue(mockUser);
         userAuthInternalRepo.createSession.mockResolvedValue(true);

         // Configure the mock query function for this test case
         mockAuthPoolQueryFn.mockResolvedValue({ rows: [{ client_count: 0 }] });

         const result = await authService.login({
            credentials: mockCredentials,
            returnUrl: "/dashboard",
            schema: "auth_internal",
            poolContext: "auth_internal",
            poolMetadata: {},
            session: {},
         });

         expect(userAuthInternalRepo.getUserByEmail).toHaveBeenCalledWith(
            "auth_internal",
            "test@test.com"
         );
         expect(userAuthInternalRepo.createSession).toHaveBeenCalledWith(
            "auth_internal",
            [
               expect.any(String), // id
               1, // user_id
               expect.any(String), // session_id
               null, // ip_address
               null, // user_agent
               expect.any(String), // expires_at
            ]
         );
         expect(result.success).toBe(true);
         expect(result.data.email).toBe("test@test.com");
         expect(result.sessionUpdate).toEqual({
            userId: 1,
            role: "user",
            poolMetadata: {
               user_role: "user",
               reason: "login_auth_internal_user_not_yet_owner",
               target_page: "/dashboard",
            },
         });
      });

      it("should detect and set owner role for users with client servers", async () => {
         const mockUser = {
            id: 1,
            name: "Owner User",
            email: "owner@test.com",
            password_hash: "password123",
            role: "user",
         };

         userAuthInternalRepo.getUserByEmail.mockResolvedValue(mockUser);
         userAuthInternalRepo.createSession.mockResolvedValue(true);

         // Configure the mock query function for this test case
         mockAuthPoolQueryFn.mockResolvedValue({ rows: [{ client_count: 3 }] });

         const result = await authService.login({
            credentials: { email: "owner@test.com", password: "password123" },
            returnUrl: "/owner",
            schema: "auth_internal",
            poolContext: "auth_internal",
            poolMetadata: {},
            session: {},
         });

         expect(mockAuthPoolQueryFn).toHaveBeenCalledWith(
            "SELECT COUNT(*) as client_count FROM client_servers WHERE user_id = $1",
            [1]
         );
         expect(result.data.role).toBe("owner");
         expect(result.sessionUpdate.role).toBe("owner");
         expect(result.sessionUpdate.poolMetadata.user_role).toBe("owner");
         expect(result.sessionUpdate.poolMetadata.owned_clients).toBe(3);
      });

      it("should login user in client schema", async () => {
         const mockUser = {
            id: 2,
            name: "Client User",
            email: "client@test.com",
            password_hash: "password123",
            role: "user",
         };

         userClientAppRepo.getUserByEmail.mockResolvedValue(mockUser);
         userClientAppRepo.createSession.mockResolvedValue(true);

         const result = await authService.login({
            credentials: { email: "client@test.com", password: "password123" },
            returnUrl: "/app",
            schema: "client_schema",
            poolContext: "client_tenant",
            poolMetadata: { client_id: "client123" },
            session: {},
         });

         expect(userClientAppRepo.getUserByEmail).toHaveBeenCalledWith(
            "client_schema",
            "client@test.com"
         );
         expect(result.data.role).toBe("user");
         expect(result.sessionUpdate.poolMetadata.user_role).toBe("user");
      });

      it("should throw ValidationError for missing credentials", async () => {
         await expect(
            authService.login({
               credentials: { email: "test@test.com" },
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);

         await expect(
            authService.login({
               credentials: { password: "password123" },
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);
      });

      it("should throw AuthError for invalid email", async () => {
         userAuthInternalRepo.getUserByEmail.mockResolvedValue(null);

         await expect(
            authService.login({
               credentials: mockCredentials,
               schema: "auth_internal",
            })
         ).rejects.toThrow(AuthError);
      });

      it("should throw AuthError for invalid password", async () => {
         const mockUser = {
            id: 1,
            email: "test@test.com",
            password_hash: "different_password",
         };

         userAuthInternalRepo.getUserByEmail.mockResolvedValue(mockUser);

         await expect(
            authService.login({
               credentials: mockCredentials,
               schema: "auth_internal",
            })
         ).rejects.toThrow(AuthError);
      });
   });

   describe("logout", () => {
      it("should logout user successfully", async () => {
         const mockDestroySession = vi.fn().mockResolvedValue();
         userAuthInternalRepo.deleteSessionByUserId.mockResolvedValue(true);

         const result = await authService.logout({
            userId: 1,
            schema: "auth_internal",
            destroySession: mockDestroySession,
         });

         expect(
            userAuthInternalRepo.deleteSessionByUserId
         ).toHaveBeenCalledWith("auth_internal", 1);
         expect(mockDestroySession).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.message).toBe("Logout successful");
      });

      it("should continue logout even if database deletion fails", async () => {
         const mockDestroySession = vi.fn().mockResolvedValue();
         userAuthInternalRepo.deleteSessionByUserId.mockRejectedValue(
            new Error("DB Error")
         );

         const result = await authService.logout({
            userId: 1,
            schema: "auth_internal",
            destroySession: mockDestroySession,
         });

         expect(mockDestroySession).toHaveBeenCalled();
         expect(result.success).toBe(true);
      });

      it("should throw AuthError when no userId provided", async () => {
         await expect(
            authService.logout({
               schema: "auth_internal",
               destroySession: vi.fn(),
            })
         ).rejects.toThrow(AuthError);
      });
   });

   describe("register", () => {
      it("should register auth-system owner successfully", async () => {
         const userData = {
            name: "New Owner",
            email: "owner@test.com",
            password: "password123",
            userType: "auth",
         };

         userAuthInternalRepo.getUserByEmail.mockResolvedValue(null);
         userAuthInternalRepo.createUser.mockResolvedValue({ lastID: 5 });

         const result = await authService.register({
            userData,
            schema: "client_schema", // Should be overridden
            poolContext: "client_tenant",
            poolMetadata: {},
         });

         expect(userAuthInternalRepo.getUserByEmail).toHaveBeenCalledWith(
            "auth_internal",
            "owner@test.com"
         );
         expect(userAuthInternalRepo.createUser).toHaveBeenCalledWith(
            "auth_internal",
            ["New Owner", "owner", "owner@test.com", "password123"]
         );
         expect(result.data.role).toBe("owner");
         expect(result.data.schema).toBe("auth_internal");
      });

      it("should register client app user in detected schema", async () => {
         const userData = {
            name: "Client User",
            email: "client@test.com",
            password: "password123",
            userType: "client",
         };

         userClientAppRepo.getUserByEmail.mockResolvedValue(null);
         userClientAppRepo.createUser.mockResolvedValue({ lastID: 10 });

         const result = await authService.register({
            userData,
            schema: "client_detected_schema",
            poolContext: "client_tenant",
            poolMetadata: { client_id: "client123" },
         });

         expect(userClientAppRepo.getUserByEmail).toHaveBeenCalledWith(
            "client_detected_schema",
            "client@test.com"
         );
         expect(userClientAppRepo.createUser).toHaveBeenCalledWith(
            "client_detected_schema",
            ["Client User", "user", "client@test.com", "password123"]
         );
         expect(result.data.role).toBe("user");
         expect(result.data.schema).toBe("client_detected_schema");
      });

      it("should use fallback schema for client users when auth_internal detected", async () => {
         const userData = {
            name: "Client User",
            email: "client@test.com",
            password: "password123",
            // userType not specified, defaults to 'client'
         };

         userClientAppRepo.getUserByEmail.mockResolvedValue(null);
         userClientAppRepo.createUser.mockResolvedValue({ lastID: 11 });

         const result = await authService.register({
            userData,
            schema: "auth_internal", // Should use fallback
            poolContext: "auth_internal",
            poolMetadata: {},
         });

         expect(userClientAppRepo.getUserByEmail).toHaveBeenCalledWith(
            "client_tradingsimulator_1748187489195",
            "client@test.com"
         );
         expect(result.data.schema).toBe(
            "client_tradingsimulator_1748187489195"
         );
      });

      it("should throw ValidationError for missing required fields", async () => {
         await expect(
            authService.register({
               userData: { name: "Test" },
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);

         await expect(
            authService.register({
               userData: { name: "Test", email: "test@test.com" },
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError when user already exists", async () => {
         const userData = {
            name: "Existing User",
            email: "existing@test.com",
            password: "password123",
            userType: "auth", // Changed to 'auth' to ensure it uses auth_internal schema
         };

         userAuthInternalRepo.getUserByEmail.mockResolvedValue({
            id: 1,
            email: "existing@test.com",
         });

         await expect(
            authService.register({
               userData,
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);
      });
   });

   describe("getSessions", () => {
      it("should retrieve all sessions for user", async () => {
         const mockSessions = [
            { id: "session1", user_id: 1, created_at: "2024-01-01" },
            { id: "session2", user_id: 1, created_at: "2024-01-02" },
         ];

         userAuthInternalRepo.getSessions.mockResolvedValue(mockSessions);

         const result = await authService.getSessions({
            userId: 1,
            schema: "auth_internal",
         });

         expect(userAuthInternalRepo.getSessions).toHaveBeenCalledWith(
            "auth_internal",
            1
         );
         expect(result.data).toEqual(mockSessions);
      });

      it("should throw AuthError when userId not provided", async () => {
         await expect(
            authService.getSessions({ schema: "auth_internal" })
         ).rejects.toThrow(AuthError);
      });
   });

   describe("getCurrentUser", () => {
      it("should retrieve current user with session role", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            role: "user",
            password: "hash",
         };

         userAuthInternalRepo.getUser.mockResolvedValue(mockUser);

         const result = await authService.getCurrentUser({
            userId: 1,
            schema: "auth_internal",
            sessionRole: "owner",
            poolMetadata: { user_role: "owner" },
         });

         expect(userAuthInternalRepo.getUser).toHaveBeenCalledWith(
            "auth_internal",
            1
         );
         expect(result.data.role).toBe("owner"); // Session role overrides DB role
         expect(result.data.poolMetadata).toEqual({ user_role: "owner" });
         expect(result.data).not.toHaveProperty("password");
      });

      it("should use default schema when not provided", async () => {
         const mockUser = { id: 1, name: "Test User", email: "test@test.com" };
         userClientAppRepo.getUser.mockResolvedValue(mockUser);

         await authService.getCurrentUser({
            userId: 1,
            schema: null,
         });

         expect(userClientAppRepo.getUser).toHaveBeenCalledWith(
            "client_template",
            1
         );
      });

      it("should throw AuthError when userId not provided", async () => {
         await expect(
            authService.getCurrentUser({ schema: "auth_internal" })
         ).rejects.toThrow(AuthError);
      });

      it("should throw AuthError when user not found", async () => {
         userAuthInternalRepo.getUser.mockResolvedValue(null);

         await expect(
            authService.getCurrentUser({
               userId: 999,
               schema: "auth_internal",
            })
         ).rejects.toThrow(AuthError);
      });
   });

   describe("getSession", () => {
      it("should return session information", async () => {
         const mockSessionData = {
            userId: 1,
            role: "user",
            schema: "auth_internal",
         };

         const result = await authService.getSession({
            userId: 1,
            sessionData: mockSessionData,
         });

         expect(result.message).toBe("Session retrieved successfully");
         expect(result.data.userId).toBe(1);
         expect(result.data.session).toEqual(mockSessionData);
      });
   });
});
