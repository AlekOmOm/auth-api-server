import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { User } from "../User.js";
import BaseModel from "../base/BaseModel.js";
import { NotFoundError, ValidationError } from "../../utils/customErrors.js";

// Mock dependencies
vi.mock("../../utils/uuid.js", () => ({
   generateUuidV4: vi.fn(),
}));
import { generateUuidV4 } from "../../utils/uuid.js";

vi.mock("../../utils/hashing.js", () => ({
   default: {
      hash: vi.fn(),
      same: vi.fn(), // Assuming User.verifyPassword uses hashing.same or hashing.verify
      verify: vi.fn(), // Mocking verify as well, as User.js uses it
   },
}));
import hashing from "../../utils/hashing.js";

vi.mock("../../utils/validationSchemas.js", () => ({
   validateUserForContext: vi.fn(),
}));
import { validateUserForContext } from "../../utils/validationSchemas.js";

// Mock BaseModel static methods if they are called by User static methods and are not relevant to User logic itself
vi.mock("../base/BaseModel.js", async (importOriginal) => {
   const actual = await importOriginal();
   return {
      ...actual,
      default: class extends actual.default {
         static fromDb(dbRow) {
            // Provide a controlled mock for BaseModel.fromDb if User.fromDb relies on super.fromDb
            // For now, assume User.fromDb is self-contained or tested through its own logic
            if (!dbRow)
               throw new NotFoundError("Mocked BaseModel: Resource not found");
            return { ...dbRow, isBaseModelMock: true };
         }
         // Add other static mocks if needed
      },
   };
});

describe("User Model", () => {
   const mockValidUserProps = {
      name: "Test User",
      role: "user",
      email: "test@example.com",
      password: "Password123!",
   };

   const mockExistingUserDbRow = {
      id: "db-uuid-123",
      name: "Existing User",
      role: "admin",
      email: "existing@example.com",
      password_hash: "hashedDbPassword",
   };

   beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks();

      // Setup default mock implementations
      generateUuidV4.mockReturnValue("mock-uuid-123");
      hashing.hash.mockImplementation((pwd) => `hashed_${pwd}`);
      hashing.verify.mockReturnValue(true);
      validateUserForContext.mockImplementation((schema, userData) => userData); // Pass-through by default
   });

   describe("Constructor", () => {
      it("should create a User instance with all properties", () => {
         const user = new User(
            "test-id",
            mockValidUserProps.name,
            mockValidUserProps.role,
            mockValidUserProps.email,
            mockValidUserProps.password
         );
         expect(user.id).toBe("test-id");
         expect(user.name).toBe(mockValidUserProps.name);
         expect(user.role).toBe(mockValidUserProps.role);
         expect(user.email).toBe(mockValidUserProps.email);
         expect(user.password).toBe(mockValidUserProps.password);
         expect(hashing.hash).toHaveBeenCalledWith(mockValidUserProps.password);
         expect(user.passwordHash).toBe(
            `hashed_${mockValidUserProps.password}`
         );
         expect(user.isValid()).toBe(true); // Assuming validation passes by default
      });

      it("should generate an ID if not provided", () => {
         const user = new User(
            null, // No ID provided
            mockValidUserProps.name,
            mockValidUserProps.role,
            mockValidUserProps.email,
            mockValidUserProps.password
         );
         expect(generateUuidV4).toHaveBeenCalled();
         expect(user.id).toBe("mock-uuid-123");
      });

      it("should use provided passwordHash if available", () => {
         const user = new User(
            "test-id",
            mockValidUserProps.name,
            mockValidUserProps.role,
            mockValidUserProps.email,
            null, // No plain password
            "providedHash"
         );
         expect(user.passwordHash).toBe("providedHash");
         expect(hashing.hash).not.toHaveBeenCalled();
      });

      it("should hash password if plain password is provided and no hash", () => {
         new User(
            null,
            mockValidUserProps.name,
            mockValidUserProps.role,
            mockValidUserProps.email,
            mockValidUserProps.password
         );
         expect(hashing.hash).toHaveBeenCalledWith(mockValidUserProps.password);
      });

      it("should call validate() on construction", () => {
         // User.prototype.validate is called internally by the constructor
         // We can spy on it if we need to assert it was called, but testing its effects is more direct.
         // For now, we assume it's called and test validation outcomes separately.
         const user = new User(
            null,
            "Valid Name",
            "user",
            "valid@email.com",
            "ValidPass1!"
         );
         // Default validation rules should pass for these values
         expect(user.isValid()).toBe(true);
      });
   });

   describe("Validation (validate method)", () => {
      it("should be valid with correct properties", () => {
         const user = new User(
            null,
            "Test User",
            "user",
            "test@example.com",
            "Password123!"
         );
         expect(user.isValid()).toBe(true);
         expect(user.getErrors()).toEqual([]);
      });

      it("should be invalid if name is missing (non-lookup)", () => {
         const user = new User(
            null,
            "",
            "user",
            "test@example.com",
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "name",
               message: "name is required",
            })
         );
      });

      it("should be invalid if email is missing (non-lookup)", () => {
         const user = new User(null, "Test User", "user", "", "Password123!");
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "email",
               message: "email is required",
            })
         );
      });

      it("should be invalid if role is missing (non-lookup)", () => {
         const user = new User(
            null,
            "Test User",
            "",
            "test@example.com",
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "role",
               message: "role is required",
            })
         );
      });

      it("should be invalid if name format is incorrect", () => {
         const user = new User(
            null,
            "Test1",
            "user",
            "test@example.com",
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "name",
               message: "Name must contain only letters and spaces",
            })
         );
      });

      it("should be invalid if name is too short", () => {
         const user = new User(
            null,
            "Te",
            "user",
            "test@example.com",
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "name",
               message: "Name must be between 3 and 50 characters",
            })
         );
      });

      it("should be invalid if email format is incorrect", () => {
         const user = new User(
            null,
            "Test User",
            "user",
            "invalid-email",
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "email",
               message: "Invalid email format",
            })
         );
      });

      it("should be invalid if email is too long", () => {
         const longEmail = "a".repeat(45) + "@example.com"; // 45 + 1 + 11 = 57 chars
         const user = new User(
            null,
            "Test User",
            "user",
            longEmail,
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "email",
               message: "Email must not exceed 50 characters",
            })
         );
      });

      it("should be invalid if role is not user, admin, or owner", () => {
         const user = new User(
            null,
            "Test User",
            "guest",
            "test@example.com",
            "Password123!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "role",
               message: "Invalid role. Must be: user, admin, or owner",
            })
         );
      });

      it("should be invalid if password is too short", () => {
         const user = new User(
            null,
            "Test User",
            "user",
            "test@example.com",
            "Pass1!"
         );
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "password",
               message: "Password must be between 8 and 100 characters",
            })
         );
      });

      it("should be invalid if password strength is weak (e.g., missing uppercase)", () => {
         // User.validatePasswordStrength is part of BaseModel/ValidationMixin, we assume it works as expected
         // The User model should correctly call it.
         const user = new User(
            null,
            "Test User",
            "user",
            "test@example.com",
            "password123!"
         ); // No uppercase
         expect(user.isValid()).toBe(false);
         expect(user.getErrors()).toContainEqual(
            expect.objectContaining({
               field: "password",
               message: "Password must contain at least one uppercase letter.",
            })
         );
      });

      it("should be valid in a lookup context (ID only)", () => {
         const user = new User("some-id", null, null, null, null, null);
         expect(user.isValid()).toBe(true);
      });

      it("should be valid in a lookup context (email only)", () => {
         const user = new User(
            null,
            null,
            null,
            "lookup@example.com",
            null,
            null
         );
         expect(user.isValid()).toBe(true);
      });
   });

   describe("Static Factory Methods", () => {
      describe("User.fromCredentials", () => {
         it("should create a valid User from credentials", () => {
            const credentials = {
               name: "Cred User",
               role: "admin",
               email: "cred@example.com",
               password: "CredPass123!",
            };
            const user = User.fromCredentials(credentials);
            expect(user.id).toBe("mock-uuid-123");
            expect(user.name).toBe(credentials.name);
            expect(user.role).toBe(credentials.role);
            expect(user.email).toBe(credentials.email);
            expect(user.passwordHash).toBe(`hashed_${credentials.password}`);
            expect(user.isValid()).toBe(true);
         });

         it('should default role to "user" if not provided in credentials', () => {
            const credentials = {
               name: "Cred User",
               email: "cred@example.com",
               password: "CredPass123!",
            }; // No role
            const user = User.fromCredentials(credentials);
            expect(user.role).toBe("user");
         });

         it("should throw ValidationError if credentials are invalid", () => {
            const invalidCredentials = {
               name: "",
               email: "invalid",
               password: "short",
            };
            expect(() => User.fromCredentials(invalidCredentials)).toThrow(
               ValidationError
            );
         });
      });

      describe("User.fromRequestBody", () => {
         it("should create a User instance from a simple request body", () => {
            const requestBody = {
               name: "Req Body User",
               role: "user",
               email: "req@example.com",
               password: "ReqBodyPass1!",
            };
            const user = User.fromRequestBody(requestBody);
            expect(user.name).toBe(requestBody.name);
            expect(user.role).toBe(requestBody.role);
            expect(user.email).toBe(requestBody.email);
            expect(user.isValid()).toBe(true);
            expect(validateUserForContext).not.toHaveBeenCalled(); // No schema in simple body
         });

         it("should create a User from a nested request body (req.body.body)", () => {
            const requestBody = {
               body: {
                  name: "Nested User",
                  email: "nested@example.com",
                  password: "NestedPass1!",
               },
            };
            const user = User.fromRequestBody(requestBody);
            expect(user.name).toBe("Nested User");
            expect(user.email).toBe("nested@example.com");
         });

         it("should call validateUserForContext if schema is provided in requestBody", () => {
            const requestBody = {
               name: "Schema User",
               email: "schema@example.com",
               password: "SchemaPass1!",
               schema: "auth_internal",
            };
            validateUserForContext.mockReturnValueOnce({
               ...requestBody,
               validatedByContext: true,
            }); // Simulate modification/validation
            const user = User.fromRequestBody(requestBody);
            expect(validateUserForContext).toHaveBeenCalledWith(
               "auth_internal",
               requestBody
            );
            expect(user.name).toBe("Schema User"); // Assuming validateUserForContext returns the data
            // Further assertions based on what validateUserForContext is expected to do
         });

         it("should call validateUserForContext if schema is provided in requestBody.body", () => {
            const requestBody = {
               body: {
                  name: "Schema User",
                  email: "schema@example.com",
                  password: "SchemaPass1!",
                  schema: "client_schema",
               },
            };
            validateUserForContext.mockReturnValueOnce({
               ...requestBody.body,
               validatedByContext: true,
            });
            const user = User.fromRequestBody(requestBody);
            expect(validateUserForContext).toHaveBeenCalledWith(
               "client_schema",
               requestBody.body
            );
         });

         it("should throw ValidationError if User instance is invalid after construction (and not lookup)", () => {
            const requestBody = { name: "", email: "invalid", role: "user" }; // Invalid data
            expect(() => User.fromRequestBody(requestBody)).toThrow(
               ValidationError
            );
         });

         it('should use default role "user" if not provided in requestBody', () => {
            const requestBody = {
               name: "Minimal User",
               email: "minimal@example.com",
               password: "MinimalPass1!",
            };
            const user = User.fromRequestBody(requestBody);
            expect(user.role).toBe("user");
         });

         it("should handle requestBody.id correctly", () => {
            const requestBody = {
               id: "provided-id",
               name: "Req Body User",
               email: "req@example.com",
            };
            const user = User.fromRequestBody(requestBody);
            expect(user.id).toBe("provided-id");
            expect(generateUuidV4).not.toHaveBeenCalled();
         });

         it("should generate id if requestBody.id is null/undefined", () => {
            const requestBody = {
               name: "Req Body User",
               email: "req@example.com",
            };
            const user = User.fromRequestBody(requestBody);
            expect(user.id).toBe("mock-uuid-123");
            expect(generateUuidV4).toHaveBeenCalled();
         });
      });

      describe("User.fromDb", () => {
         it("should create a User instance from a database row", () => {
            const user = User.fromDb(mockExistingUserDbRow);
            expect(user.id).toBe(mockExistingUserDbRow.id);
            expect(user.name).toBe(mockExistingUserDbRow.name);
            expect(user.role).toBe(mockExistingUserDbRow.role);
            expect(user.email).toBe(mockExistingUserDbRow.email);
            expect(user.passwordHash).toBe(mockExistingUserDbRow.password_hash);
            expect(user.password).toBeNull(); // Should not have plain password from DB
            expect(user.isValid()).toBe(true); // Should be valid as it comes from DB
         });

         it("should throw NotFoundError if dbRow is null or undefined", () => {
            expect(() => User.fromDb(null)).toThrow(NotFoundError);
            expect(() => User.fromDb(undefined)).toThrow(NotFoundError);
         });
      });

      describe("User.forAuth", () => {
         it("should create a User instance for authentication check", () => {
            const email = "authcheck@example.com";
            const password = "AuthPass123!";
            const user = User.forAuth(email, password);
            expect(user.id).toBe("mock-uuid-123"); // ID is generated
            expect(user.name).toBeNull();
            expect(user.role).toBe("user"); // Defaults to user
            expect(user.email).toBe(email);
            expect(user.password).toBe(password);
            expect(user.passwordHash).toBe(`hashed_${password}`);
            expect(user.getErrors()).toEqual([]); // Errors should be cleared
            expect(user.isValid()).toBe(true); // Even with minimal data, forAuth clears errors
         });
      });
   });

   describe("Immutable Transformation Methods", () => {
      let baseUser;
      beforeEach(() => {
         baseUser = new User(
            "orig-id",
            "Original Name",
            "user",
            "original@example.com",
            null,
            "originalHash"
         );
      });

      it("withRole should return a new User with updated role", () => {
         const updatedUser = baseUser.withRole("admin");
         expect(updatedUser).not.toBe(baseUser);
         expect(updatedUser.id).toBe(baseUser.id);
         expect(updatedUser.role).toBe("admin");
         expect(updatedUser.name).toBe(baseUser.name);
         expect(updatedUser.passwordHash).toBe(baseUser.passwordHash);
         expect(updatedUser.isValid()).toBe(true);
      });

      it("withName should return a new User with updated name", () => {
         const updatedUser = baseUser.withName("New Name");
         expect(updatedUser).not.toBe(baseUser);
         expect(updatedUser.name).toBe("New Name");
         expect(updatedUser.role).toBe(baseUser.role);
         expect(updatedUser.isValid()).toBe(true);
      });

      it("withEmail should return a new User with updated email", () => {
         const updatedUser = baseUser.withEmail("new@example.com");
         expect(updatedUser).not.toBe(baseUser);
         expect(updatedUser.email).toBe("new@example.com");
         expect(updatedUser.role).toBe(baseUser.role);
         expect(updatedUser.isValid()).toBe(true);
      });

      it("withPassword should return a new User with new hashed password", () => {
         hashing.hash.mockReturnValueOnce("hashed_NewPass1!");
         const updatedUser = baseUser.withPassword("NewPass1!");
         expect(updatedUser).not.toBe(baseUser);
         expect(hashing.hash).toHaveBeenCalledWith("NewPass1!");
         expect(updatedUser.passwordHash).toBe("hashed_NewPass1!");
         expect(updatedUser.password).toBe("NewPass1!"); // Constructor keeps plain pass temporarily
         expect(updatedUser.role).toBe(baseUser.role);
         expect(updatedUser.isValid()).toBe(true);
      });
   });

   describe("Data Transformation Methods", () => {
      let userInstance;
      beforeEach(() => {
         userInstance = User.fromDb(mockExistingUserDbRow);
      });

      describe("User.update", () => {
         it("should update allowed fields and return a new User instance", () => {
            const updates = { name: "Updated Name", role: "user" };
            const updatedUser = User.update(updates, userInstance);
            expect(updatedUser).not.toBe(userInstance);
            expect(updatedUser.name).toBe("Updated Name");
            expect(updatedUser.role).toBe("user");
            expect(updatedUser.email).toBe(userInstance.email);
            expect(updatedUser.id).toBe(userInstance.id);
            expect(updatedUser.passwordHash).toBe(userInstance.passwordHash);
            expect(updatedUser.isValid()).toBe(true);
         });

         it("should not update disallowed fields", () => {
            const updates = {
               name: "Updated Name",
               email: "changed@example.com",
               id: "new-id",
            };
            const updatedUser = User.update(updates, userInstance);
            expect(updatedUser.name).toBe("Updated Name");
            expect(updatedUser.email).toBe(userInstance.email); // Email not in allowedUpdates
            expect(updatedUser.id).toBe(userInstance.id); // ID not in allowedUpdates
         });

         it("should throw ValidationError if existingUser is not provided", () => {
            expect(() => User.update({}, null)).toThrow(ValidationError);
         });
      });

      it("toDatabaseObject should return correct DB representation", () => {
         const dbObject = userInstance.toDatabaseObject();
         expect(dbObject).toEqual({
            id: mockExistingUserDbRow.id,
            name: mockExistingUserDbRow.name,
            role: mockExistingUserDbRow.role,
            email: mockExistingUserDbRow.email,
            password_hash: mockExistingUserDbRow.password_hash,
         });
      });

      it("toDatabaseArray should return correct array representation", () => {
         const dbArray = userInstance.toDatabaseArray();
         expect(dbArray).toEqual([
            mockExistingUserDbRow.id,
            mockExistingUserDbRow.name,
            mockExistingUserDbRow.role,
            mockExistingUserDbRow.email,
            mockExistingUserDbRow.password_hash,
         ]);
      });

      it("toApiResponse should return a safe representation without sensitive data", () => {
         const apiResponse = userInstance.toApiResponse();
         expect(apiResponse).toEqual({
            id: mockExistingUserDbRow.id,
            name: mockExistingUserDbRow.name,
            role: mockExistingUserDbRow.role,
            email: mockExistingUserDbRow.email,
         });
         expect(apiResponse.passwordHash).toBeUndefined();
         expect(apiResponse.password).toBeUndefined();
      });

      it("toJwtPayload should return correct JWT payload", () => {
         const jwtPayload = userInstance.toJwtPayload();
         expect(jwtPayload).toEqual({
            id: mockExistingUserDbRow.id,
            email: mockExistingUserDbRow.email,
            role: mockExistingUserDbRow.role,
         });
      });
   });

   describe("Predicate Methods", () => {
      it("hasRole should return true if user has the role, false otherwise", () => {
         const user = new User(null, "Test", "admin", "admin@example.com");
         expect(user.hasRole("admin")).toBe(true);
         expect(user.hasRole("user")).toBe(false);
      });

      it("isPrivileged should return true for admin or owner, false for user", () => {
         const adminUser = new User(null, "Test", "admin", "admin@example.com");
         const ownerUser = new User(null, "Test", "owner", "owner@example.com");
         const regularUser = new User(null, "Test", "user", "user@example.com");
         expect(adminUser.isPrivileged()).toBe(true);
         expect(ownerUser.isPrivileged()).toBe(true);
         expect(regularUser.isPrivileged()).toBe(false);
      });

      describe("canManage", () => {
         const owner = new User(null, "Owner", "owner", "o@e.com");
         const admin1 = new User("admin1-id", "Admin1", "admin", "a1@e.com");
         const admin2 = new User("admin2-id", "Admin2", "admin", "a2@e.com");
         const user1 = new User("user1-id", "User1", "user", "u1@e.com");
         const user2 = new User("user2-id", "User2", "user", "u2@e.com");

         it("owner can manage anyone", () => {
            expect(owner.canManage(admin1)).toBe(true);
            expect(owner.canManage(user1)).toBe(true);
         });
         it("admin can manage users", () => {
            expect(admin1.canManage(user1)).toBe(true);
         });
         it("admin cannot manage other admins", () => {
            expect(admin1.canManage(admin2)).toBe(false);
         });
         it("admin cannot manage owners", () => {
            expect(admin1.canManage(owner)).toBe(false);
         });
         it("user can only manage themselves", () => {
            expect(user1.canManage(user1)).toBe(true);
            expect(user1.canManage(user2)).toBe(false);
            expect(user1.canManage(admin1)).toBe(false);
         });
      });

      it("verifyPassword should call hashing.verify with correct arguments", () => {
         const user = User.fromDb(mockExistingUserDbRow);
         user.verifyPassword("testPlainPassword");
         expect(hashing.verify).toHaveBeenCalledWith(
            "testPlainPassword",
            mockExistingUserDbRow.password_hash
         );
      });

      it("verifyPassword should return false if user has no passwordHash", () => {
         const user = new User(null, "Test", "user", "no@hash.com");
         user.passwordHash = null; // Ensure no hash
         expect(user.verifyPassword("anyPassword")).toBe(false);
         expect(hashing.verify).not.toHaveBeenCalled();
      });
   });

   // Test for logging in constructor if generateUuidV4 fails (as added in User.js)
   describe("Constructor ID Generation Failure Logging", () => {
      let consoleErrorSpy;

      beforeEach(() => {
         consoleErrorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
      });

      afterEach(() => {
         consoleErrorSpy.mockRestore();
      });

      it("should log an error if generateUuidV4 returns null", () => {
         generateUuidV4.mockReturnValueOnce(null);
         new User(null, "Test", "user", "test@example.com", "Password123!");
         expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining(
               "[USER_MODEL_CONSTRUCTOR_ERROR] Invalid or missing UUID generated"
            )
         );
      });

      it("should log an error if generateUuidV4 returns an empty string", () => {
         generateUuidV4.mockReturnValueOnce("");
         new User(null, "Test", "user", "test@example.com", "Password123!");
         expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining(
               "[USER_MODEL_CONSTRUCTOR_ERROR] Invalid or missing UUID generated"
            )
         );
      });

      it("should log an error if generateUuidV4 throws an error", () => {
         generateUuidV4.mockImplementationOnce(() => {
            throw new Error("UUID generation failed");
         });
         new User(null, "Test", "user", "test@example.com", "Password123!");
         expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining(
               "[USER_MODEL_CONSTRUCTOR_ERROR] Error during generateUuidV4() call:"
            ),
            expect.any(Error)
         );
      });
   });
});
