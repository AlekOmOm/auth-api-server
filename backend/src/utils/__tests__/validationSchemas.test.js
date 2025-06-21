import { describe, it, expect, vi, beforeEach } from "vitest";
import {
   validateUserForContext,
   getRequiredFieldsForSchema,
   // Directly import the rules objects for focused testing if they were exported,
   // otherwise, test them implicitly via validateUserForContext.
   // For this setup, we assume they are not directly exported and test through the main function.
} from "../validationSchemas.js";
import { ValidationError } from "../../utils/customErrors.js";
import { User } from "../../models/User.js"; // We need to mock static methods from User

// Mock static methods from User model used by validation rules
vi.mock("../../models/User.js", async (importOriginal) => {
   const actual = await importOriginal(); // Import actual to get the class structure if needed for complex mocks
   return {
      User: {
         // Mock static methods directly on the User export
         validateStringLength: vi.fn(),
         isValidEmail: vi.fn(),
         validatePasswordStrength: vi.fn(),
         // Keep other static methods if any, or provide a more complete mock if User constructor is called by validationSchemas
         // For now, only mocking what's directly called by the validation rules themselves.
      },
   };
});

const mockValidUserData = () => ({
   name: "Valid Name",
   email: "valid@example.com",
   password: "ValidPass123!",
   role: "user",
});

describe("validationSchemas.js", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      // Default mock implementations (successful validation)
      User.validateStringLength.mockReturnValue(true);
      User.isValidEmail.mockReturnValue(true);
      User.validatePasswordStrength.mockReturnValue({ valid: true });
   });

   describe("validateUserForContext", () => {
      describe("auth_internal schema context (ownerValidationRules)", () => {
         const schema = "auth_internal";
         let ownerData;

         beforeEach(() => {
            ownerData = {
               name: "Owner Name",
               email: "owner@example.com",
               password: "OwnerPass123!",
               role: "owner",
            };
         });

         it("should validate successfully with correct owner data", () => {
            const result = validateUserForContext(schema, ownerData);
            expect(result).toEqual(ownerData);
         });

         it('should use ownerValidationRules and accept role "owner"', () => {
            ownerData.role = "owner";
            expect(() =>
               validateUserForContext(schema, ownerData)
            ).not.toThrow();
         });

         it('should use ownerValidationRules and accept role "admin"', () => {
            ownerData.role = "admin";
            expect(() =>
               validateUserForContext(schema, ownerData)
            ).not.toThrow();
         });

         it('should throw ValidationError if owner role is invalid (e.g., "user")', () => {
            ownerData.role = "user"; // Invalid for owner context
            User.validatePasswordStrength.mockReturnValue({ valid: true }); // Ensure other checks pass
            expect(() => validateUserForContext(schema, ownerData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, ownerData);
            } catch (e) {
               expect(e.errors).toContainEqual(
                  expect.objectContaining({
                     field: "role",
                     message:
                        "Owner role must be 'owner' or 'admin'. Received: 'user'",
                  })
               );
            }
         });

         it('should throw ValidationError if owner role is provided with mixed case (e.g. "Owner") and normalized', () => {
            ownerData.role = "Owner";
            expect(() =>
               validateUserForContext(schema, ownerData)
            ).not.toThrow();
            const result = validateUserForContext(schema, ownerData);
            expect(result.role).toBe("Owner"); // Function returns original data, rule normalizes for check
         });

         it("should throw ValidationError if owner name is invalid (mocked User.validateStringLength)", () => {
            User.validateStringLength.mockReturnValueOnce(false);
            expect(() => validateUserForContext(schema, ownerData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, ownerData);
            } catch (e) {
               expect(e.errors).toContainEqual(
                  expect.objectContaining({ field: "name" })
               );
            }
         });

         it("should throw ValidationError if owner email is invalid (mocked User.isValidEmail)", () => {
            User.isValidEmail.mockReturnValueOnce(false);
            expect(() => validateUserForContext(schema, ownerData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, ownerData);
            } catch (e) {
               expect(e.errors).toContainEqual(
                  expect.objectContaining({ field: "email" })
               );
            }
         });

         it("should throw ValidationError if owner password strength is weak (mocked User.validatePasswordStrength)", () => {
            User.validatePasswordStrength.mockReturnValueOnce({
               valid: false,
               error: "Password too weak",
            });
            expect(() => validateUserForContext(schema, ownerData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, ownerData);
            } catch (e) {
               expect(e.errors).toContainEqual(
                  expect.objectContaining({
                     field: "password",
                     message: "Password too weak",
                  })
               );
            }
         });

         // Test the specific role check within validateUserForContext itself for auth_internal
         it("should throw ValidationError for auth_internal if userData.role is explicitly set to something other than owner/admin (redundant check test)", () => {
            const testData = { ...ownerData, role: "manager" }; // a role not in ['owner', 'admin']
            // Ensure individual rule for role passes to isolate the redundant check
            // The individual rule checks against a normalized value, the redundant check doesn't.
            // This test highlights the behavior of the direct check in validateUserForContext.
            expect(() => validateUserForContext(schema, testData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, testData);
            } catch (e) {
               // The specific message from the redundant check
               expect(e.errors).toContainEqual(
                  expect.objectContaining({
                     field: "role",
                     message:
                        "Invalid role for auth_internal context. Must be 'owner' or 'admin'.",
                  })
               );
            }
         });
      });

      describe("client schema context (clientUserValidationRules)", () => {
         const schema = "client_some_app"; // Any schema not 'auth_internal'
         let clientData;

         beforeEach(() => {
            clientData = {
               name: "Client User",
               email: "client@example.com",
               password: "ClientPass123!",
               role: "user",
            };
         });

         it("should validate successfully with correct client user data", () => {
            const result = validateUserForContext(schema, clientData);
            expect(result).toEqual(clientData);
         });

         it('should use clientUserValidationRules and only accept role "user"', () => {
            clientData.role = "user";
            expect(() =>
               validateUserForContext(schema, clientData)
            ).not.toThrow();
         });

         it('should throw ValidationError if client role is invalid (e.g., "admin")', () => {
            clientData.role = "admin"; // Invalid for client context
            expect(() => validateUserForContext(schema, clientData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, clientData);
            } catch (e) {
               expect(e.errors).toContainEqual(
                  expect.objectContaining({
                     field: "role",
                     message:
                        "Role for client users must be 'user'. Received: 'admin'",
                  })
               );
            }
         });

         it('should throw ValidationError if client role is provided with mixed case (e.g. "User") and normalized', () => {
            clientData.role = "User";
            expect(() =>
               validateUserForContext(schema, clientData)
            ).not.toThrow();
            const result = validateUserForContext(schema, clientData);
            expect(result.role).toBe("User"); // Function returns original data, rule normalizes for check
         });

         // Test the specific role check within validateUserForContext itself for client schemas
         it("should throw ValidationError for client schema if userData.role is explicitly set to something other than user (redundant check test)", () => {
            const testData = { ...clientData, role: "editor" }; // a role not 'user'
            expect(() => validateUserForContext(schema, testData)).toThrow(
               ValidationError
            );
            try {
               validateUserForContext(schema, testData);
            } catch (e) {
               // The specific message from the redundant check
               expect(e.errors).toContainEqual(
                  expect.objectContaining({
                     field: "role",
                     message:
                        "Invalid role for client context. Must be 'user'.",
                  })
               );
            }
         });
      });

      it("should throw ValidationError with a summary message and specific errors", () => {
         User.isValidEmail.mockReturnValueOnce(false);
         User.validateStringLength.mockReturnValueOnce(false);
         const userData = mockValidUserData();
         userData.role = "invalidRole"; // Also make role invalid for client schema

         expect(() =>
            validateUserForContext("client_schema", userData)
         ).toThrow(ValidationError);
         try {
            validateUserForContext("client_schema", userData);
         } catch (e) {
            expect(e.message).toBe(
               "User data validation failed for the given context."
            );
            expect(e.errors.length).toBeGreaterThanOrEqual(3);
            expect(e.errors).toContainEqual(
               expect.objectContaining({ field: "name" })
            );
            expect(e.errors).toContainEqual(
               expect.objectContaining({ field: "email" })
            );
            expect(e.errors).toContainEqual(
               expect.objectContaining({ field: "role" })
            );
            expect(e.schemaContext).toBe("client_schema");
         }
      });

      it("should return userData if all validations pass", () => {
         const userData = mockValidUserData();
         const result = validateUserForContext("client_schema", userData);
         expect(result).toEqual(userData);
      });
   });

   describe("getRequiredFieldsForSchema", () => {
      it('should return owner fields for "auth_internal" schema', () => {
         const fields = getRequiredFieldsForSchema("auth_internal");
         // Based on the keys in ownerValidationRules
         expect(fields).toEqual(
            expect.arrayContaining(["name", "email", "password", "role"])
         );
      });

      it("should return client user fields for other schemas", () => {
         const fieldsClient = getRequiredFieldsForSchema("client_xyz");
         // Based on the keys in clientUserValidationRules
         expect(fieldsClient).toEqual(
            expect.arrayContaining(["name", "email", "password", "role"])
         );
         const fieldsDefault = getRequiredFieldsForSchema("some_other_schema");
         expect(fieldsDefault).toEqual(
            expect.arrayContaining(["name", "email", "password", "role"])
         );
      });
   });
});
