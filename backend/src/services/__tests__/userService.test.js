import { describe, it, expect, beforeEach, vi } from "vitest";
import userService from "../../services/user.js";
import {
   NotFoundError,
   ValidationError,
} from "../../middleware/errorHandler.js";
import hashing from "../../utils/hashing.js";

// Mock the repositories
vi.mock("../../repo/repositories/userRepository.js", () => ({
   userRepo: {
      getUsers: vi.fn(),
      getUser: vi.fn(),
      getUserByNameAndEmail: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
   },
}));

vi.mock("../../repo/clientAppRepository.js", () => ({
   userRepo: {
      getUsers: vi.fn(),
      getUser: vi.fn(),
      getUserByNameAndEmail: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
   },
}));

// Mock hashing utility
vi.mock("../../utils/hashing.js", () => ({
   default: {
      same: vi.fn(),
   },
}));

// Mock auth utils
vi.mock("../../utils/authUtils.js", () => ({
   removePasswordFromUser: vi.fn((user) => {
      const { password, password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
   }),
}));

// Import mocked modules
import { userRepo as userAuthInternalRepo } from "../../repo/repositories/userRepository.js";
import { userRepo as userClientAppRepo } from "../../repo/clientAppRepository.js";

describe("userService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe("getUsers", () => {
      it("should return all users from auth_internal schema", async () => {
         const mockUsers = [
            {
               id: 1,
               name: "User 1",
               email: "user1@test.com",
               password: "hash1",
            },
            {
               id: 2,
               name: "User 2",
               email: "user2@test.com",
               password: "hash2",
            },
         ];
         userAuthInternalRepo.getUsers.mockResolvedValue(mockUsers);

         const result = await userService.getUsers("auth_internal");

         expect(userAuthInternalRepo.getUsers).toHaveBeenCalledWith(
            "auth_internal"
         );
         expect(result).toEqual({
            message: "Users retrieved successfully",
            data: {
               users: [
                  { id: 1, name: "User 1", email: "user1@test.com" },
                  { id: 2, name: "User 2", email: "user2@test.com" },
               ],
            },
         });
      });

      it("should return all users from client schema", async () => {
         const mockUsers = [
            {
               id: 3,
               name: "Client User",
               email: "client@test.com",
               password: "hash3",
            },
         ];
         userClientAppRepo.getUsers.mockResolvedValue(mockUsers);

         const result = await userService.getUsers("client_schema");

         expect(userClientAppRepo.getUsers).toHaveBeenCalledWith(
            "client_schema"
         );
         expect(result.data.users).toHaveLength(1);
      });

      it("should handle empty user list", async () => {
         userAuthInternalRepo.getUsers.mockResolvedValue([]);

         const result = await userService.getUsers("auth_internal");

         expect(result.data.users).toEqual([]);
      });
   });

   describe("getUser", () => {
      it("should get user by id", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password: "hash",
         };
         userAuthInternalRepo.getUser.mockResolvedValue(mockUser);

         const result = await userService.getUser({
            id: 1,
            schema: "auth_internal",
         });

         expect(userAuthInternalRepo.getUser).toHaveBeenCalledWith(
            "auth_internal",
            1
         );
         expect(result).toEqual({
            message: "User retrieved successfully",
            data: { id: 1, name: "Test User", email: "test@test.com" },
         });
      });

      it("should get user by name and email", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password: "hash",
         };
         userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(mockUser);

         const result = await userService.getUser({
            name: "Test User",
            email: "test@test.com",
            schema: "auth_internal",
         });

         expect(
            userAuthInternalRepo.getUserByNameAndEmail
         ).toHaveBeenCalledWith("auth_internal", "Test User", "test@test.com");
         expect(result.data.name).toBe("Test User");
      });

      it("should throw ValidationError when neither id nor name/email provided", async () => {
         await expect(
            userService.getUser({ schema: "auth_internal" })
         ).rejects.toThrow(ValidationError);
      });

      it("should handle login flow with password verification", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password: "hashedPassword",
         };
         userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(mockUser);
         hashing.same.mockReturnValue(true);

         const result = await userService.getUser({
            name: "Test User",
            email: "test@test.com",
            schema: "auth_internal",
            forLogin: true,
            password: "plainPassword",
         });

         expect(hashing.same).toHaveBeenCalledWith(
            "plainPassword",
            "hashedPassword"
         );
         expect(result.data).not.toHaveProperty("password");
      });

      it("should throw ValidationError for invalid password during login", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password: "hashedPassword",
         };
         userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(mockUser);
         hashing.same.mockReturnValue(false);

         await expect(
            userService.getUser({
               name: "Test User",
               email: "test@test.com",
               schema: "auth_internal",
               forLogin: true,
               password: "wrongPassword",
            })
         ).rejects.toThrow(ValidationError);
      });
   });

   describe("getUserById", () => {
      it("should retrieve user by id successfully", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password: "hash",
         };
         userClientAppRepo.getUser.mockResolvedValue(mockUser);

         const result = await userService.getUserById(1, "client_schema");

         expect(userClientAppRepo.getUser).toHaveBeenCalledWith(
            "client_schema",
            1
         );
         expect(result.data).toEqual({
            id: 1,
            name: "Test User",
            email: "test@test.com",
         });
      });

      it("should throw ValidationError when id is not provided", async () => {
         await expect(
            userService.getUserById(null, "auth_internal")
         ).rejects.toThrow(ValidationError);
      });

      it("should throw NotFoundError when user does not exist", async () => {
         userAuthInternalRepo.getUser.mockResolvedValue(null);

         await expect(
            userService.getUserById(999, "auth_internal")
         ).rejects.toThrow(NotFoundError);
      });
   });

   describe("getUserByNameAndEmail", () => {
      it("should retrieve user by name and email", async () => {
         const mockUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
            password: "hash",
         };
         userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(mockUser);

         const result = await userService.getUserByNameAndEmail({
            name: "Test User",
            email: "test@test.com",
            schema: "auth_internal",
         });

         expect(result.data).toEqual({
            id: 1,
            name: "Test User",
            email: "test@test.com",
         });
      });

      it("should throw ValidationError when name or email is missing", async () => {
         await expect(
            userService.getUserByNameAndEmail({
               name: "Test User",
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);

         await expect(
            userService.getUserByNameAndEmail({
               email: "test@test.com",
               schema: "auth_internal",
            })
         ).rejects.toThrow(ValidationError);
      });

      it("should throw NotFoundError when user does not exist", async () => {
         userAuthInternalRepo.getUserByNameAndEmail.mockResolvedValue(null);

         await expect(
            userService.getUserByNameAndEmail({
               name: "Non Existent",
               email: "nonexistent@test.com",
               schema: "auth_internal",
            })
         ).rejects.toThrow(NotFoundError);
      });
   });

   describe("createUser", () => {
      it("should create a new user successfully", async () => {
         const newUser = {
            name: "New User",
            email: "new@test.com",
            password: "password123",
         };
         userAuthInternalRepo.createUser.mockResolvedValue({ lastID: 5 });

         const result = await userService.createUser(newUser, "auth_internal");

         expect(userAuthInternalRepo.createUser).toHaveBeenCalledWith(
            "auth_internal",
            ["New User", "user", "new@test.com", "password123"]
         );
         expect(result).toEqual({
            message: "User created successfully",
            data: {
               id: 5,
               name: "New User",
               role: "user",
               email: "new@test.com",
            },
         });
      });

      it("should create user with specified role", async () => {
         const newUser = {
            name: "Admin User",
            email: "admin@test.com",
            password: "password123",
            role: "admin",
         };
         userAuthInternalRepo.createUser.mockResolvedValue({ lastID: 6 });

         const result = await userService.createUser(newUser, "auth_internal");

         expect(userAuthInternalRepo.createUser).toHaveBeenCalledWith(
            "auth_internal",
            ["Admin User", "admin", "admin@test.com", "password123"]
         );
         expect(result.data.role).toBe("admin");
      });

      it("should throw ValidationError when required fields are missing", async () => {
         await expect(
            userService.createUser({ name: "Test" }, "auth_internal")
         ).rejects.toThrow(ValidationError);

         await expect(
            userService.createUser(
               { name: "Test", email: "test@test.com" },
               "auth_internal"
            )
         ).rejects.toThrow(ValidationError);
      });
   });

   describe("updateUser", () => {
      it("should update user successfully", async () => {
         const existingUser = {
            id: 1,
            name: "Old Name",
            email: "old@test.com",
            role: "user",
            password: "oldHash",
         };
         userAuthInternalRepo.getUser.mockResolvedValue(existingUser);
         userAuthInternalRepo.updateUser.mockResolvedValue(true);

         const updateData = {
            name: "New Name",
            email: "new@test.com",
         };

         const result = await userService.updateUser(
            1,
            updateData,
            "auth_internal"
         );

         expect(userAuthInternalRepo.updateUser).toHaveBeenCalledWith(
            "auth_internal",
            ["New Name", "user", "new@test.com", "oldHash", 1]
         );
         expect(result.data).toEqual({
            id: 1,
            name: "New Name",
            role: "user",
            email: "new@test.com",
         });
      });

      it("should update only provided fields", async () => {
         const existingUser = {
            id: 1,
            name: "Old Name",
            email: "old@test.com",
            role: "user",
            password: "oldHash",
         };
         userAuthInternalRepo.getUser.mockResolvedValue(existingUser);
         userAuthInternalRepo.updateUser.mockResolvedValue(true);

         const updateData = { role: "admin" };

         await userService.updateUser(1, updateData, "auth_internal");

         expect(userAuthInternalRepo.updateUser).toHaveBeenCalledWith(
            "auth_internal",
            ["Old Name", "admin", "old@test.com", "oldHash", 1]
         );
      });

      it("should throw ValidationError when id is not provided", async () => {
         await expect(
            userService.updateUser(null, { name: "New Name" }, "auth_internal")
         ).rejects.toThrow(ValidationError);
      });

      it("should throw NotFoundError when user does not exist", async () => {
         userAuthInternalRepo.getUser.mockResolvedValue(null);

         await expect(
            userService.updateUser(999, { name: "New Name" }, "auth_internal")
         ).rejects.toThrow(NotFoundError);
      });
   });

   describe("deleteUser", () => {
      it("should delete user successfully", async () => {
         const existingUser = {
            id: 1,
            name: "Test User",
            email: "test@test.com",
         };
         userAuthInternalRepo.getUser.mockResolvedValue(existingUser);
         userAuthInternalRepo.deleteUser.mockResolvedValue(true);

         const result = await userService.deleteUser(1, "auth_internal");

         expect(userAuthInternalRepo.deleteUser).toHaveBeenCalledWith(
            "auth_internal",
            1
         );
         expect(result).toEqual({
            message: "User deleted successfully",
         });
      });

      it("should throw ValidationError when id is not provided", async () => {
         await expect(
            userService.deleteUser(null, "auth_internal")
         ).rejects.toThrow(ValidationError);
      });

      it("should throw NotFoundError when user does not exist", async () => {
         userAuthInternalRepo.getUser.mockResolvedValue(null);

         await expect(
            userService.deleteUser(999, "auth_internal")
         ).rejects.toThrow(NotFoundError);
      });
   });
});
