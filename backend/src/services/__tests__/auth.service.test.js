import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import authService, {
   login,
   logout,
   register,
   getSessions,
   getCurrentUser,
   getSession,
   validateUserSchemaAccess,
} from "../auth.js";
import userService from "../user.js";
import sessionService from "../session.js";
import clientServerService from "../clientServer.js";
import { User, Session } from "../../models/index.js"; // Assuming ClientServer model might also be needed for servicesMap
import sessionUtils from "../../utils/request/session.js";
import { prepareInstance as originalPrepareInstance } from "../../models/functional/index.js";
import {
   AuthError,
   ConflictError,
   NotFoundError,
   ValidationError,
} from "../../middleware/errorHandler.js";

// Mock entire modules
vi.mock("../user.js");
vi.mock("../session.js");
vi.mock("../clientServer.js");
vi.mock("../../utils/request/session.js");

// Mock specific model static methods if they are used directly by auth service's helpers
// The internal `prep` helper uses Model.fromRequestBody
vi.mock("../../models/index.js", async () => {
   return {
      User: {
         fromRequestBody: vi.fn(),
         name: "User", // For servicesMap
      },
      Session: {
         fromRequestBody: vi.fn(),
         name: "Session", // For servicesMap
      },
      ClientServer: {
         fromRequestBody: vi.fn(), // Though not directly used by tested functions, good to have if servicesMap is tested implicitly
         name: "ClientServer",
      },
   };
});

// Mock functional utilities
vi.mock("../../models/functional/index.js", () => ({
   prepareInstance: vi.fn((instance, fields) => {
      // Simple mock: return a subset of the instance based on fields
      const prepared = {};
      for (const field of fields) {
         if (instance && instance.hasOwnProperty(field)) {
            prepared[field] = instance[field];
         }
      }
      return prepared;
   }),
}));

const TEST_SCHEMA = "test_schema";
const mockReq = {
   session: {
      save: vi.fn((callback) => callback()), // Mock session.save to call its callback immediately
   },
};

describe("AuthService", () => {
   let mockUser;
   let mockSession;
   let mockConsoleError;
   let mockConsoleWarn;

   beforeEach(() => {
      vi.clearAllMocks();

      mockConsoleError = vi
         .spyOn(console, "error")
         .mockImplementation(() => {});
      mockConsoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

      mockUser = {
         id: "user-123",
         name: "Test User",
         email: "test@example.com",
         role: "user",
         password_hash: "hashedPassword",
      };

      mockSession = {
         id: "session-db-id-789",
         sessionId: "session-uuid-456", // This is what gets set in express session
         userId: "user-123",
         schema: TEST_SCHEMA,
         expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      };

      // Default mock implementations for services
      userService.get.mockResolvedValue({ success: true, data: mockUser });
      userService.createUser.mockResolvedValue({
         success: true,
         data: mockUser,
      });

      sessionService.create.mockResolvedValue({
         success: true,
         data: mockSession,
      });
      sessionService.deleteSession.mockResolvedValue({
         success: true,
         data: {},
      });
      sessionService.getSessionsByUser.mockResolvedValue({
         success: true,
         data: [mockSession],
      });

      clientServerService.getAllowedUrls.mockResolvedValue({
         success: true,
         data: ["http://allowed.com"],
      });

      // Default mock for model static methods used by prep/execute
      User.fromRequestBody.mockResolvedValue(mockUser);
      Session.fromRequestBody.mockResolvedValue(mockSession);

      sessionUtils.setObj.mockImplementation(() => {});
      sessionUtils.getSession.mockReturnValue(mockReq.session);
   });

   afterEach(() => {
      mockConsoleError.mockRestore();
      mockConsoleWarn.mockRestore();
   });

   describe("login", () => {
      const loginCredentials = {
         email: "test@example.com",
         password: "password123",
      };

      it("should login successfully and return user, session, and allowedUrls", async () => {
         const result = await login({
            credentials: loginCredentials,
            schema: TEST_SCHEMA,
            req: mockReq,
         });

         expect(userService.get).toHaveBeenCalledWith({
            email: loginCredentials.email,
            password: loginCredentials.password,
            schema: TEST_SCHEMA,
            returnPwd: false,
         });
         // Session.fromRequestBody is called by the internal 'execute' helper
         expect(Session.fromRequestBody).toHaveBeenCalledWith({
            userId: mockUser.id,
            schema: TEST_SCHEMA,
            ipAddress: null,
            userAgent: null,
         });
         expect(sessionService.create).toHaveBeenCalled(); // Mocked function, ensure it was called
         expect(clientServerService.getAllowedUrls).toHaveBeenCalledWith({
            userId: mockUser.id,
            schema: TEST_SCHEMA,
         });
         expect(sessionUtils.setObj).toHaveBeenCalledWith(
            mockReq,
            expect.objectContaining({
               userId: mockUser.id,
               sessionId: mockSession.sessionId,
               isAuthenticated: true,
               allowedUrls: ["http://allowed.com"],
            })
         );
         expect(mockReq.session.save).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.data.user.id).toBe(mockUser.id);
         expect(result.data.session.id).toBe(mockSession.id);
         expect(result.sessionUpdate.sessionId).toBe(mockSession.sessionId);
         expect(result.message).toBe("Login successful");
      });

      it("should throw AuthError if userService.get fails (user not found/wrong password)", async () => {
         userService.get.mockResolvedValueOnce({
            success: false,
            message: "User not found",
         });
         await expect(
            login({
               credentials: loginCredentials,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow(AuthError);
         await expect(
            login({
               credentials: loginCredentials,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow("User not found");
      });

      it("should throw AuthError if session creation fails", async () => {
         Session.fromRequestBody.mockResolvedValueOnce(mockSession); // Prep stage of execute
         sessionService.create.mockResolvedValueOnce({
            success: false,
            message: "Session creation failed internally",
         });
         await expect(
            login({
               credentials: loginCredentials,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow(AuthError);
         // The error message comes from the sessionService.create failure through the execute helper
         await expect(
            login({
               credentials: loginCredentials,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow("Session creation failed internally");
      });

      it("should proceed with login even if getAllowedUrls fails", async () => {
         clientServerService.getAllowedUrls.mockRejectedValueOnce(
            new Error("Failed to get URLs")
         );
         const result = await login({
            credentials: loginCredentials,
            schema: TEST_SCHEMA,
            req: mockReq,
         });
         expect(result.success).toBe(true);
         expect(result.data.allowedUrls).toEqual([]); // Should default to empty array
         expect(sessionUtils.setObj).toHaveBeenCalledWith(
            mockReq,
            expect.objectContaining({ allowedUrls: [] })
         );
         expect(mockConsoleWarn).toHaveBeenCalledWith(
            "Failed to get allowed URLs for user:",
            "Failed to get URLs"
         );
      });
   });

   describe("register", () => {
      const registerData = {
         name: "New Reg User",
         email: "newreg@example.com",
         password: "NewRegPass1!",
         role: "user",
      };

      it("should register a user successfully", async () => {
         userService.get.mockRejectedValueOnce(
            new NotFoundError("User not found for email check")
         ); // Email not found initially
         userService.createUser.mockResolvedValueOnce({
            success: true,
            data: { ...mockUser, ...registerData, id: "new-reg-id" },
         });
         sessionService.create.mockResolvedValueOnce({
            success: true,
            data: { ...mockSession, userId: "new-reg-id" },
         });

         const result = await register({
            userData: registerData,
            schema: TEST_SCHEMA,
            req: mockReq,
         });

         expect(userService.get).toHaveBeenCalledWith({
            email: registerData.email,
            schema: TEST_SCHEMA,
         });
         expect(userService.createUser).toHaveBeenCalledWith(
            registerData,
            TEST_SCHEMA
         );
         expect(sessionService.create).toHaveBeenCalledWith({
            userId: "new-reg-id",
            schema: TEST_SCHEMA,
         });
         expect(sessionUtils.setObj).toHaveBeenCalled();
         expect(mockReq.session.save).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.data.user.email).toBe(registerData.email);
         expect(result.message).toBe(
            "User registered and logged in successfully"
         );
      });

      it("should throw ConflictError if email already exists", async () => {
         userService.get.mockResolvedValueOnce({
            success: true,
            data: mockUser,
         }); // Email found
         await expect(
            register({
               userData: registerData,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow(ConflictError);
      });

      it("should throw AuthError if userService.createUser fails", async () => {
         userService.get.mockRejectedValueOnce(new NotFoundError()); // Email not found
         userService.createUser.mockResolvedValueOnce({
            success: false,
            message: "User creation service failed",
         });
         await expect(
            register({
               userData: registerData,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow(AuthError);
         await expect(
            register({
               userData: registerData,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow("User creation service failed");
      });

      it("should throw AuthError if sessionService.create fails post-registration", async () => {
         userService.get.mockRejectedValueOnce(new NotFoundError());
         userService.createUser.mockResolvedValueOnce({
            success: true,
            data: { ...mockUser, id: "new-reg-id" },
         });
         sessionService.create.mockResolvedValueOnce({
            success: false,
            message: "Session creation post-reg failed",
         });
         await expect(
            register({
               userData: registerData,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow(AuthError);
         await expect(
            register({
               userData: registerData,
               schema: TEST_SCHEMA,
               req: mockReq,
            })
         ).rejects.toThrow("Session creation post-reg failed");
      });
   });

   describe("logout", () => {
      it("should logout successfully", async () => {
         Session.fromRequestBody.mockResolvedValueOnce({
            userId: "user-123",
            schema: TEST_SCHEMA,
         });
         sessionService.deleteSession.mockResolvedValueOnce({
            success: true,
            data: {},
         });
         const result = await logout({
            userId: "user-123",
            schema: TEST_SCHEMA,
         });
         expect(Session.fromRequestBody).toHaveBeenCalledWith({
            userId: "user-123",
            sessionId: null,
            schema: TEST_SCHEMA,
         });
         expect(sessionService.deleteSession).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.message).toBe("Logout successful");
      });

      it("should throw AuthError if session deletion fails", async () => {
         Session.fromRequestBody.mockResolvedValueOnce({
            userId: "user-123",
            schema: TEST_SCHEMA,
         });
         sessionService.deleteSession.mockResolvedValueOnce({
            success: false,
            message: "Deletion failed",
         });
         await expect(
            logout({ userId: "user-123", schema: TEST_SCHEMA })
         ).rejects.toThrow(AuthError);
         await expect(
            logout({ userId: "user-123", schema: TEST_SCHEMA })
         ).rejects.toThrow("Deletion failed");
      });
   });

   describe("getSessions", () => {
      it("should get sessions for a user successfully", async () => {
         Session.fromRequestBody.mockResolvedValueOnce({
            userId: "user-123",
            schema: TEST_SCHEMA,
         }); // For prep
         sessionService.getSessionsByUser.mockResolvedValueOnce({
            success: true,
            data: [mockSession],
         });
         const result = await getSessions({
            userId: "user-123",
            schema: TEST_SCHEMA,
         });
         expect(Session.fromRequestBody).toHaveBeenCalledWith({
            userId: "user-123",
            schema: TEST_SCHEMA,
         });
         expect(sessionService.getSessionsByUser).toHaveBeenCalled();
         expect(result.success).toBe(true);
         expect(result.data).toEqual([mockSession]);
         expect(result.message).toBe("Sessions retrieved successfully");
      });

      it("should throw AuthError if userId is missing for getSessions", async () => {
         // The 'check' function at the start of getSessions should throw.
         // This might be a plain Error or specific ValidationError depending on how 'check' is implemented.
         // The actual `check` in auth.js throws AuthError.
         await expect(getSessions({ schema: TEST_SCHEMA })).rejects.toThrow(
            AuthError
         );
         await expect(getSessions({ schema: TEST_SCHEMA })).rejects.toThrow(
            "User ID is required for getting sessions"
         );
      });
   });

   describe("getCurrentUser", () => {
      it("should get current user successfully", async () => {
         User.fromRequestBody.mockResolvedValueOnce({
            id: "user-123",
            schema: TEST_SCHEMA,
         });
         // Mocking the userService.getUser call which is mapped via servicesMap
         // This assumes userService is correctly set in servicesMap for User model.
         userService.getUser = vi
            .fn()
            .mockResolvedValueOnce({ success: true, data: mockUser });

         const result = await getCurrentUser({
            userId: "user-123",
            schema: TEST_SCHEMA,
         });

         expect(User.fromRequestBody).toHaveBeenCalledWith({
            id: "user-123",
            schema: TEST_SCHEMA,
         });
         expect(userService.getUser).toHaveBeenCalled(); // Check if the mapped service method was called
         expect(result.success).toBe(true);
         expect(result.data).toEqual(mockUser);
         expect(result.message).toBe("Current user retrieved successfully");
      });
   });

   describe("getSession", () => {
      it("should return formatted session information", () => {
         const sessionData = {
            sessionId: "sess-abc",
            schema: "client_x",
            role: "admin",
            isAuthenticated: true,
            allowedUrls: ["/a"],
            expires_at: "2025-01-01T00:00:00.000Z",
         };
         const result = getSession({ userId: "user-789", sessionData });
         expect(result.success).toBe(true);
         expect(result.data).toEqual({
            userId: "user-789",
            sessionId: "sess-abc",
            schema: "client_x",
            role: "admin",
            isAuthenticated: true,
            allowedUrls: ["/a"],
            expires_at: "2025-01-01T00:00:00.000Z",
         });
         expect(result.message).toBe(
            "Session information retrieved successfully"
         );
      });

      it("should throw AuthError if userId is missing for getSession", async () => {
         await expect(getSession({ sessionData: {} })).rejects.toThrow(
            AuthError
         );
         await expect(getSession({ sessionData: {} })).rejects.toThrow(
            "User ID is required for getting session"
         );
      });
   });

   describe("validateUserSchemaAccess", () => {
      const userId = "user-xyz";
      const userSchema = "schema_A";
      const targetSchema = "schema_B";

      it("should grant access if userSchema equals targetSchema", async () => {
         const result = await validateUserSchemaAccess(
            userId,
            userSchema,
            userSchema
         );
         expect(result).toBe(true);
      });

      it("should grant access if user is owner/admin in auth_internal", async () => {
         userService.get.mockResolvedValueOnce({
            success: true,
            data: { id: userId, email: "owner@internal.com", role: "owner" },
         });
         const result = await validateUserSchemaAccess(
            userId,
            "auth_internal",
            targetSchema
         );
         expect(result).toBe(true);
         expect(userService.get).toHaveBeenCalledWith({
            id: userId,
            schema: "auth_internal",
         });
      });

      it("should throw AuthError for unauthorized cross-schema access", async () => {
         userService.get.mockResolvedValueOnce({
            success: true,
            data: { id: userId, email: "user@schema_A.com", role: "user" },
         });
         await expect(
            validateUserSchemaAccess(userId, userSchema, targetSchema)
         ).rejects.toThrow(AuthError);
         await expect(
            validateUserSchemaAccess(userId, userSchema, targetSchema)
         ).rejects.toThrow(
            `User from schema '${userSchema}' is not authorized to access data in schema '${targetSchema}'.`
         );
      });

      it("should throw AuthError if user not found during schema access validation", async () => {
         userService.get.mockResolvedValueOnce({
            success: false,
            message: "User not found",
         });
         await expect(
            validateUserSchemaAccess(userId, userSchema, targetSchema)
         ).rejects.toThrow(AuthError);
         await expect(
            validateUserSchemaAccess(userId, userSchema, targetSchema)
         ).rejects.toThrow(
            "User session invalid or user not found, cannot validate schema access."
         );
      });

      it("should throw AuthError if any parameter is missing", async () => {
         await expect(
            validateUserSchemaAccess(null, userSchema, targetSchema)
         ).rejects.toThrow(AuthError);
         await expect(
            validateUserSchemaAccess(null, userSchema, targetSchema)
         ).rejects.toThrow(
            "Cannot validate schema access: missing session or target schema information."
         );
      });
   });
});
