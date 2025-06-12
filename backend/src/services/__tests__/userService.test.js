import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import userService from "../../services/user.js";
import {
   NotFoundError,
   ValidationError,
} from "../../middleware/errorHandler.js";
import hashing from "../../utils/hashing.js";
import { generateUuidV4 } from "../../utils/uuid.js";

// Mock hashing utility (User model uses hashing.hash directly)
vi.mock("../../utils/hashing.js", () => ({
   default: {
      hash: vi.fn((password) => `hashed_${password}`), // Predictable hash for testing
      same: vi.fn((password, dbHash) => dbHash === `hashed_${password}`),
   },
}));

// Mock auth utils (if userService or its direct utilities use this)
vi.mock("../../utils/authUtils.js", () => ({
   removePasswordFromUser: vi.fn((user) => {
      if (!user) return null;
      // Simulate removing password properties
      const { password, password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
   }),
}));

// Removed imports for userAuthInternalRepo and userClientAppRepo

const generateUniqueEmail = (base = "testuser") =>
   `${base}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 7)}@example.com`;
const TEST_SCHEMA_AUTH = "auth_internal"; // Assuming this schema is set up by backend initialization

describe("userService - Integration with Database", () => {
   let createdUserIds = []; // To keep track of created users for cleanup

   beforeEach(() => {
      vi.clearAllMocks(); // Clears hashing.same, hashing.hash, removePasswordFromUser calls
      createdUserIds = [];
      // Note: We are not clearing tables here broadly, relying on `make restart-full-backend` (hopefully)
      // and the afterEach for specific test cleanup.
   });

   afterEach(async () => {
      // Cleanup created users to avoid interference between tests
      for (const userId of createdUserIds) {
         try {
            // console.log(`Attempting to delete user ${userId} from ${TEST_SCHEMA_AUTH}`);
            await userService.deleteUser(userId, TEST_SCHEMA_AUTH);
            // console.log(`Successfully deleted user ${userId}`);
         } catch (error) {
            // console.warn(`Error cleaning up user ${userId} in schema ${TEST_SCHEMA_AUTH}:`, error.message, error.stack);
         }
      }
   });

   describe("createUser", () => {
      it("should create a new user in auth_internal schema and allow retrieval", async () => {
         const uniqueEmail = generateUniqueEmail("create");
         const newUserInput = {
            name: "CreateUser",
            email: uniqueEmail,
            password: "password123",
            role: "user", // userService.createUser defaults to 'user' if not specified in input
         };

         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         // console.log("Create result:", JSON.stringify(createResult, null, 2));

         expect(createResult.success).toBe(true);
         expect(createResult.data).toBeDefined();
         const userId = createResult.data.id;
         expect(userId).toBeDefined();
         createdUserIds.push(userId); // Add to cleanup list

         expect(createResult.data.email).toBe(uniqueEmail);
         expect(createResult.data.name).toBe(newUserInput.name);
         expect(createResult.data.role).toBe(newUserInput.role); // User model sets default to 'user' if not in input. createUser service also defaults role.

         // Verify by fetching the user using userService.get
         const fetchResult = await userService.get({
            id: userId,
            schema: TEST_SCHEMA_AUTH,
         });
         // console.log("Fetch result:", JSON.stringify(fetchResult, null, 2));

         expect(fetchResult.success).toBe(true);
         expect(fetchResult.data).toBeDefined();
         expect(fetchResult.data.id).toBe(userId);
         expect(fetchResult.data.email).toBe(uniqueEmail);
         expect(fetchResult.data.name).toBe(newUserInput.name);
         expect(fetchResult.data.role).toBe(newUserInput.role);
         // Password hash check depends on the mock. If User model itself calls hashing.hash, this mock is used.
         expect(fetchResult.data.password_hash).toBe(
            `hashed_${newUserInput.password}`
         );
      });

      it("should default role to 'user' if not provided during creation in service layer", async () => {
         const uniqueEmail = generateUniqueEmail("defaultrole");
         const newUserInput = {
            name: "DefaultRoleUser",
            email: uniqueEmail,
            password: "password123",
            // role is omitted, service layer should default it
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         expect(createResult.data.role).toBe("user"); // userService.createUser sets this default
         createdUserIds.push(createResult.data.id);
      });

      it("should throw ValidationError when required fields (name, email, password) are missing for createUser", async () => {
         // Test cases for missing fields - User model validation should trigger
         await expect(
            userService.createUser(
               { name: "TestOnlyName", password: "pw" },
               TEST_SCHEMA_AUTH
            )
         ).rejects.toThrow(ValidationError);

         await expect(
            userService.createUser(
               { email: generateUniqueEmail("onlyemail"), password: "pw" },
               TEST_SCHEMA_AUTH
            )
         ).rejects.toThrow(ValidationError);

         await expect(
            userService.createUser(
               { name: "TestNameNoPW", email: generateUniqueEmail("nopw") },
               TEST_SCHEMA_AUTH
            )
         ).rejects.toThrow(ValidationError);
      });

      it("should throw ValidationError if user with the same email already exists", async () => {
         const uniqueEmail = generateUniqueEmail("duplicate");
         const firstUserInput = {
            name: "FirstUser",
            email: uniqueEmail,
            password: "password123",
            role: "user",
         };

         const createResult1 = await userService.createUser(
            firstUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult1.success).toBe(true);
         expect(createResult1.data.id).toBeDefined();
         createdUserIds.push(createResult1.data.id);

         const secondUserInput = {
            name: "SecondUser",
            email: uniqueEmail,
            password: "password456",
            role: "user",
         };
         // This should fail because the User model's fromRequestBody (or the repo's create logic) should prevent duplicates
         // Or the service layer checks using .get before creating.
         // The current pipeline calls `User.fromRequestBody` then `repo.query('create')`.
         // If the DB has a UNIQUE constraint on email, the repo.query('create') will fail.
         await expect(
            userService.createUser(secondUserInput, TEST_SCHEMA_AUTH)
         ).rejects.toThrow(Error); // Could be ValidationError or a generic DB error depending on implementation
      });
   });

   describe("getUsers", () => {
      it("should return a list of users, including newly created ones", async () => {
         // This test needs actual users in the database.
         // Create a couple of users first.
         const email1 = generateUniqueEmail("getall1");
         const user1Input = {
            name: "GetAll1",
            email: email1,
            password: "password123",
            role: "user",
         };
         const createdUser1 = await userService.createUser(
            user1Input,
            TEST_SCHEMA_AUTH
         );
         expect(createdUser1.success).toBe(true);
         createdUserIds.push(createdUser1.data.id);

         const email2 = generateUniqueEmail("getall2");
         const user2Input = {
            name: "GetAll2",
            email: email2,
            password: "password456",
            role: "admin",
         };
         const createdUser2 = await userService.createUser(
            user2Input,
            TEST_SCHEMA_AUTH
         );
         expect(createdUser2.success).toBe(true);
         createdUserIds.push(createdUser2.data.id);

         const result = await userService.getUsers(TEST_SCHEMA_AUTH);
         expect(result.success).toBe(true);
         expect(Array.isArray(result.data)).toBe(true);

         // Check if the created users are in the list
         const foundUser1 = result.data.find(
            (u) => u.id === createdUser1.data.id
         );
         const foundUser2 = result.data.find(
            (u) => u.id === createdUser2.data.id
         );

         expect(foundUser1).toBeDefined();
         expect(foundUser1.email).toBe(email1);
         expect(foundUser2).toBeDefined();
         expect(foundUser2.email).toBe(email2);
      });
      it("should handle empty user list if no users exist", async () => {
         // Assuming a clean state or a schema with no users for this specific test.
         // This is hard to guarantee without specific per-test setup/teardown of all data.
         // For now, let's assume it might return an empty list if the DB is empty.
         const result = await userService.getUsers(TEST_SCHEMA_AUTH); // Use a potentially empty schema or clean up thoroughly
         expect(result.success).toBe(true);
         expect(result.data).toEqual([]); // Expect empty array if no users
      });
   });

   describe("get (formerly getUser)", () => {
      it("should get user by id if user exists", async () => {
         const uniqueEmail = generateUniqueEmail("getid");
         const newUserInput = {
            name: "GetUserById",
            email: uniqueEmail,
            password: "password123",
            role: "user",
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         const userId = createResult.data.id;
         createdUserIds.push(userId);

         const result = await userService.get({
            id: userId,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(result.success).toBe(true);
         expect(result.data).toBeDefined();
         expect(result.data.id).toBe(userId);
         expect(result.data.email).toBe(uniqueEmail);
      });

      it("should return success:false when getting user by non-existent id", async () => {
         const nonExistentId = generateUuidV4(); // Assuming generateUuidV4 is available
         const result = await userService.get({
            id: nonExistentId,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(result.success).toBe(false);
         expect(result.message).toContain("User not found");
      });

      it("should get user by email if user exists", async () => {
         const uniqueEmail = generateUniqueEmail("getemail");
         const newUserInput = {
            name: "GetUserByEmail",
            email: uniqueEmail,
            password: "password123",
            role: "user",
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         createdUserIds.push(createResult.data.id);

         const result = await userService.get({
            email: uniqueEmail,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(result.success).toBe(true);
         expect(result.data).toBeDefined();
         expect(result.data.email).toBe(uniqueEmail);
      });

      it("should correctly verify password with hashing.same mock for login flow", async () => {
         const uniqueEmail = generateUniqueEmail("loginflow");
         const plainPassword = "loginPassword123";
         const newUserInput = {
            name: "LoginFlowUser",
            email: uniqueEmail,
            password: plainPassword,
            role: "user",
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         createdUserIds.push(createResult.data.id);
         const createdUser = createResult.data;

         // Successful login
         const loginResult = await userService.get({
            email: uniqueEmail,
            password: plainPassword,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(loginResult.success).toBe(true);
         expect(loginResult.data.email).toBe(uniqueEmail);
         // Check if hashing.same was called correctly by userService.get's internal logic
         // The actual hash is `hashed_${plainPassword}` due to the mock.
         expect(hashing.same).toHaveBeenCalledWith(
            plainPassword,
            `hashed_${plainPassword}`
         );
         // userService.get, when password is provided, should return the user if valid, without raw password
         expect(loginResult.data.password_hash).toBeDefined(); // It returns the hash
         expect(loginResult.data.password).toBeUndefined();
      });

      it("should return ValidationError for invalid password with hashing.same mock", async () => {
         const uniqueEmail = generateUniqueEmail("loginfail");
         const correctPassword = "correctPassword123";
         const wrongPassword = "wrongPassword123";
         const newUserInput = {
            name: "LoginFailUser",
            email: uniqueEmail,
            password: correctPassword,
            role: "user",
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         createdUserIds.push(createResult.data.id);

         // Tell the mock that hashing.same will return false for this attempt
         vi.mocked(hashing.default.same).mockReturnValueOnce(false);

         const loginResult = await userService.get({
            email: uniqueEmail,
            password: wrongPassword,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(loginResult.success).toBe(false);
         expect(loginResult.error).toBeInstanceOf(ValidationError);
         expect(loginResult.message).toContain("Password is incorrect");
         expect(hashing.same).toHaveBeenCalledWith(
            wrongPassword,
            `hashed_${correctPassword}`
         );
      });
   });

   describe("getUserById", () => {
      it("should retrieve user by id successfully", async () => {
         const uniqueEmail = generateUniqueEmail("getbyid");
         const newUserInput = {
            name: "GetByIdDirect",
            email: uniqueEmail,
            password: "password123",
            role: "user",
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         const userId = createResult.data.id;
         createdUserIds.push(userId);

         const result = await userService.getUserById(userId, TEST_SCHEMA_AUTH);
         expect(result.success).toBe(true);
         expect(result.data).toBeDefined();
         expect(result.data.id).toBe(userId);
         expect(result.data.email).toBe(uniqueEmail);
      });

      it("should throw NotFoundError when user does not exist via getUserById", async () => {
         const nonExistentId = generateUuidV4();
         await expect(
            userService.getUserById(nonExistentId, TEST_SCHEMA_AUTH)
         ).rejects.toThrow(NotFoundError);
      });
   });

   describe("updateUser", () => {
      it("should update user's name and role successfully", async () => {
         const uniqueEmail = generateUniqueEmail("update");
         const initialName = "InitialUpdateUser";
         const initialRole = "user";
         const newUserInput = {
            name: initialName,
            email: uniqueEmail,
            password: "password123",
            role: initialRole,
         };

         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         const userId = createResult.data.id;
         createdUserIds.push(userId);

         const updatedName = "NameIsUpdated";
         const updatedRole = "admin";
         const updateData = { name: updatedName, role: updatedRole };

         const updateResult = await userService.updateUser(
            userId,
            updateData,
            TEST_SCHEMA_AUTH
         );
         expect(updateResult.success).toBe(true);
         expect(updateResult.data).toBeDefined();
         expect(updateResult.data.id).toBe(userId);
         expect(updateResult.data.name).toBe(updatedName);
         expect(updateResult.data.role).toBe(updatedRole);

         // Verify with a direct fetch
         const fetchResult = await userService.get({
            id: userId,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(fetchResult.data.name).toBe(updatedName);
         expect(fetchResult.data.role).toBe(updatedRole);
      });

      it("should throw NotFoundError when trying to update a non-existent user", async () => {
         const nonExistentId = generateUuidV4();
         await expect(
            userService.updateUser(
               nonExistentId,
               { name: "GhostUser" },
               TEST_SCHEMA_AUTH
            )
         ).rejects.toThrow(NotFoundError);
      });
   });

   describe("deleteUser", () => {
      it("should delete an existing user successfully", async () => {
         const uniqueEmail = generateUniqueEmail("delete");
         const newUserInput = {
            name: "ToBeDeletedUser",
            email: uniqueEmail,
            password: "password123",
            role: "user",
         };
         const createResult = await userService.createUser(
            newUserInput,
            TEST_SCHEMA_AUTH
         );
         expect(createResult.success).toBe(true);
         const userId = createResult.data.id;
         // Do not add to createdUserIds for this test, as we are testing its deletion

         const deleteResult = await userService.deleteUser(
            userId,
            TEST_SCHEMA_AUTH
         );
         expect(deleteResult.success).toBe(true);
         expect(deleteResult.message).toBe("User deleted successfully");

         // Verify user is actually deleted by trying to fetch
         const fetchResult = await userService.get({
            id: userId,
            schema: TEST_SCHEMA_AUTH,
         });
         expect(fetchResult.success).toBe(false);
         expect(fetchResult.message).toContain("User not found");
      });

      it("should return success:false (or handle error) when trying to delete a non-existent user", async () => {
         const nonExistentId = generateUuidV4();
         // The service's pipeline for deleteUser calls fromRequestBody(id) first.
         // User.fromRequestBody will create a user instance with just the ID.
         // The repo.query('delete', instance) will then run. If the ID doesn't exist,
         // the DB op won't delete anything, and the repo might return a result indicating 0 rows affected.
         // The pipeline currently returns the raw result from the executor.
         // If executor (repo.query) returns e.g. { rowCount: 0 }, the pipeline returns that as `data`.
         // The service then wraps this. Let's assume service indicates failure.
         const result = await userService.deleteUser(
            nonExistentId,
            TEST_SCHEMA_AUTH
         );
         expect(result.success).toBe(false); // Based on how the pipeline in user.js handles no data from repo
         expect(result.message).toContain(
            "Failed to execute repository operation or resource not found"
         );
      });
   });

   // describe("getUserByNameAndEmail", () => {
   //    /*
   //    it("should retrieve user by name and email", async () => {
   //       // REMOVED: userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(mockUser);
   //       // const result = await userService.getUserByNameAndEmail({ name: "Test User", email: "test@test.com", schema: "auth_internal" });
   //       // expect(result.data.name).toBe("Test User");
   //    });
   //    it("should throw ValidationError when name or email is missing", async () => {
   //       await expect(userService.getUserByNameAndEmail({ name: "Test User", schema: "auth_internal" })).rejects.toThrow(ValidationError);
   //       await expect(userService.getUserByNameAndEmail({ email: "test@test.com", schema: "auth_internal" })).rejects.toThrow(ValidationError);
   //    });
   //    it("should throw NotFoundError when user does not exist", async () => {
   //       // REMOVED: userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(null);
   //       // await expect(userService.getUserByNameAndEmail({ name: "Non Existent", email: "nonexistent@test.com", schema: "auth_internal" })).rejects.toThrow(NotFoundError);
   //    });
   //    */
   // });
});
