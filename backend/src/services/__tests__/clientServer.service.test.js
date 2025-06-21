import { describe, it, expect, beforeEach, vi } from "vitest";

// Top-level mocks for other modules (not used inside ClientServer.js mock factory)
const mockToDB = vi.fn((instance) => instance);
const mockRepoInternalQueryFn = vi.fn();
const mockGetPoolForClientSchema = vi.fn();
const mockRepoQueryFn = vi.fn();

vi.mock("../../models/ClientServer.js", () => {
   // Define mock functions for ClientServer's static methods *inside* this factory
   const factoryMockCSFromRequestBody = vi.fn();
   const factoryMockCSUpdate = vi.fn();
   return {
      __esModule: true,
      ClientServer: {
         // Named export 'ClientServer'
         fromRequestBody: factoryMockCSFromRequestBody,
         update: factoryMockCSUpdate,
      },
   };
});

vi.mock("../../models/User.js", () => {
   const MockUser = vi.fn().mockImplementation(() => ({}));
   return {
      __esModule: true,
      User: MockUser, // Provide named User export
   };
});

vi.mock("../../repo/connection/queries/index.js", () => ({
   __esModule: true,
   default: mockRepoInternalQueryFn,
   operations: {},
}));

vi.mock(
   "virtual-ddl-client-servers",
   () => ({
      __esModule: true,
      CREATE_CLIENT_SERVERS_TABLE: "mock DDL string",
      default: "mock DDL default string",
   }),
   { virtual: true }
);

vi.mock(
   "virtual-ddl-users-sessions",
   () => ({
      __esModule: true,
      CREATE_USERS_TABLE: "mock DDL string",
      CREATE_SESSIONS_TABLE: "mock DDL string",
      default: "mock DDL default string for users_sessions",
   }),
   { virtual: true }
);

vi.mock("../../repo/connection/pools/clientServers.js", () => ({
   __esModule: true,
   getPoolForSchema: mockGetPoolForClientSchema,
}));

vi.mock("../../repo/index.js", () => {
   return vi.fn().mockImplementation(() => ({
      query: mockRepoQueryFn,
   }));
});

vi.mock("../../models/functional/index.js", async (importOriginal) => {
   try {
      const actual = await importOriginal();
      return {
         ...actual,
         __esModule: true,
         toDB: mockToDB,
      };
   } catch (e) {
      return {
         __esModule: true,
         toDB: mockToDB,
         fromDB: vi.fn(),
         operations: {},
         prepareInstance: vi.fn(),
      };
   }
});

import clientServerService from "../clientServer.js";
import { ClientServer } from "../models/index.js";
import Repo from "../../repo/index.js";

describe("clientServerService", () => {
   const mockSchema = "test_schema";

   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe("register", () => {
      const clientServerData = { name: "Test App" };
      const userId = "user123";
      const mockResolvedInstance = {
         id: "client1",
         ...clientServerData,
         userId,
      };
      const mockRepoResult = {
         ...mockResolvedInstance,
         created_at: new Date().toISOString(),
      };

      it("should register a new client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockResolvedInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.register({
            clientServerData,
            userId,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(
            clientServerData,
            userId
         );
         expect(mockToDB).toHaveBeenCalledWith(mockResolvedInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "create",
            mockResolvedInstance
         );
         expect(result).toEqual({
            message: "Client server registered successfully",
            data: mockRepoResult,
         });
      });

      it("should throw an error if fromRequestBody fails", async () => {
         const error = new Error("Validation failed");
         ClientServer.fromRequestBody.mockRejectedValue(error);

         await expect(
            clientServerService.register({
               clientServerData,
               userId,
               schema: mockSchema,
            })
         ).rejects.toThrow("Validation failed");
         expect(mockRepoQueryFn).not.toHaveBeenCalled();
      });

      it("should throw an error if repo query fails", async () => {
         const error = new Error("DB error");
         ClientServer.fromRequestBody.mockResolvedValue(mockResolvedInstance);
         mockRepoQueryFn.mockRejectedValue(error);

         await expect(
            clientServerService.register({
               clientServerData,
               userId,
               schema: mockSchema,
            })
         ).rejects.toThrow("DB error");
      });
   });

   describe("getUserClientServers", () => {
      const userId = "user123";
      const mockInstance = { userId };
      const mockRepoResult = [{ id: "client1" }, { id: "client2" }];

      it("should get user client servers successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.getUserClientServers({
            userId,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(userId);
         expect(mockToDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "getByUserId",
            mockInstance
         );
         expect(result).toEqual({
            message: "Client servers retrieved successfully",
            data: mockRepoResult,
         });
      });

      it("should throw an error if repo query fails", async () => {
         const error = new Error("DB error");
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockRejectedValue(error);
         await expect(
            clientServerService.getUserClientServers({
               userId,
               schema: mockSchema,
            })
         ).rejects.toThrow("DB error");
      });
   });

   describe("getUserClientServer", () => {
      const userId = "user123";
      const clientId = "client1";
      const mockInstance = { userId, clientId };
      const mockRepoResult = { id: clientId, name: "Test App" };

      it("should get a specific user client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.getUserClientServer({
            userId,
            clientId,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(
            userId,
            clientId
         );
         expect(mockToDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "getByUserIdAndClientId",
            mockInstance
         );
         expect(result).toEqual({
            message: "Client server retrieved successfully",
            data: mockRepoResult,
         });
      });
   });

   describe("updateUserClientServer", () => {
      const userId = "user123";
      const clientId = "client1";
      const updateData = { name: "Updated App Name" };
      const existingClientServerData = {
         id: clientId,
         name: "Old App Name",
         secret_hash: "hash1",
         user_id: userId,
      };
      const updatedInstanceDataFromModel = {
         ...existingClientServerData,
         ...updateData,
      };
      const instanceForFirstCall = { userId, clientId };
      const instanceForSecondCall = updatedInstanceDataFromModel;
      const mockRepoResultUpdate = {
         ...updatedInstanceDataFromModel,
         updated_at: new Date().toISOString(),
      };

      it("should update client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForFirstCall
         );
         mockToDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockResolvedValueOnce(existingClientServerData);

         ClientServer.update.mockReturnValue(updatedInstanceDataFromModel);

         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForSecondCall
         );
         mockToDB.mockReturnValueOnce(instanceForSecondCall);
         mockRepoQueryFn.mockResolvedValueOnce(mockRepoResultUpdate);

         const result = await clientServerService.updateUserClientServer({
            userId,
            clientId,
            updateData,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenNthCalledWith(
            1,
            userId,
            clientId
         );
         expect(mockToDB).toHaveBeenNthCalledWith(1, instanceForFirstCall);
         expect(Repo).toHaveBeenNthCalledWith(1, mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenNthCalledWith(
            1,
            "getByUserIdAndClientId",
            instanceForFirstCall
         );

         expect(ClientServer.update).toHaveBeenCalledWith(
            updateData,
            existingClientServerData
         );

         expect(ClientServer.fromRequestBody).toHaveBeenNthCalledWith(
            2,
            updatedInstanceDataFromModel
         );
         expect(mockToDB).toHaveBeenNthCalledWith(2, instanceForSecondCall);
         expect(Repo).toHaveBeenNthCalledWith(2, mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenNthCalledWith(
            2,
            "update",
            instanceForSecondCall
         );

         expect(result).toEqual({
            message: "Client server updated successfully",
            data: mockRepoResultUpdate,
         });
      });

      it("should throw if getting existing client server fails", async () => {
         const error = new Error("Get existing failed");
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForFirstCall
         );
         mockToDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockRejectedValueOnce(error);

         await expect(
            clientServerService.updateUserClientServer({
               userId,
               clientId,
               updateData,
               schema: mockSchema,
            })
         ).rejects.toThrow("Get existing failed");

         expect(ClientServer.update).not.toHaveBeenCalled();
         expect(mockRepoQueryFn).toHaveBeenCalledTimes(1);
      });

      it("should throw if ClientServer.update fails (conceptually, if it threw, pipeline would catch if fromRequestBody fails with its result)", async () => {
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForFirstCall
         );
         mockToDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockResolvedValueOnce(existingClientServerData);

         ClientServer.update.mockReturnValue(updatedInstanceDataFromModel);

         const updateError = new Error("Update validation failed");
         ClientServer.fromRequestBody.mockRejectedValueOnce(updateError);

         await expect(
            clientServerService.updateUserClientServer({
               userId,
               clientId,
               updateData,
               schema: mockSchema,
            })
         ).rejects.toThrow("Update validation failed");

         expect(ClientServer.update).toHaveBeenCalledWith(
            updateData,
            existingClientServerData
         );
         expect(mockRepoQueryFn).toHaveBeenCalledTimes(1);
         expect(mockRepoQueryFn).not.toHaveBeenNthCalledWith(
            2,
            "update",
            expect.anything()
         );
      });

      it("should throw if final repo update query fails", async () => {
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForFirstCall
         );
         mockToDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockResolvedValueOnce(existingClientServerData);

         ClientServer.update.mockReturnValue(updatedInstanceDataFromModel);

         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForSecondCall
         );
         mockToDB.mockReturnValueOnce(instanceForSecondCall);
         const updateDbError = new Error("Update DB error");
         mockRepoQueryFn.mockRejectedValueOnce(updateDbError);

         await expect(
            clientServerService.updateUserClientServer({
               userId,
               clientId,
               updateData,
               schema: mockSchema,
            })
         ).rejects.toThrow("Update DB error");

         expect(mockRepoQueryFn).toHaveBeenCalledTimes(2);
      });
   });

   describe("deleteUserClientServer", () => {
      const userId = "user123";
      const clientId = "client1";
      const mockInstance = { userId, clientId };
      const mockRepoResult = { affectedRows: 1 };

      it("should delete a client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.deleteUserClientServer({
            userId,
            clientId,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(
            userId,
            clientId
         );
         expect(mockToDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "deleteByUserIdAndClientId",
            mockInstance
         );
         expect(result).toEqual({
            message: "Client server deleted successfully",
            data: mockRepoResult,
         });
      });
   });

   describe("verifySecretHash", () => {
      const secretHash = "someSecretHash";
      const mockInstance = { secretHash };
      const mockRepoResult = { id: "client1", name: "Test App" };

      it("should verify secret hash and retrieve client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.verifySecretHash({
            secretHash,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(secretHash);
         expect(mockToDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "getBySecretHash",
            mockInstance
         );
         expect(result).toEqual({
            message: "Client server retrieved successfully",
            data: mockRepoResult,
         });
      });
   });

   describe("checkReferer", () => {
      const refererUrl = "https://example.com/app";
      const mockInstance = { refererUrl };
      const mockRepoResult = { id: "client1", identifier_url: refererUrl };

      it("should check referer and retrieve client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.checkReferer({
            refererUrl,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(refererUrl);
         expect(mockToDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "getByReferer",
            mockInstance
         );
         expect(result).toEqual({
            message: "Client server retrieved successfully",
            data: mockRepoResult,
         });
      });
   });

   describe("getByUrl", () => {
      const url = "https://example.com/some/path";
      const mockInstance = { url };
      const mockRepoResult = { id: "client1", identifier_url: url };

      it("should get client server by URL successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.getByUrl({
            url,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(url);
         expect(mockToDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith(
            "getByReferer",
            mockInstance
         );
         expect(result).toEqual({
            message: "Client server retrieved successfully",
            data: mockRepoResult,
         });
      });

      it("should throw an error if fromRequestBody fails for getByUrl", async () => {
         const error = new Error("URL processing failed");
         ClientServer.fromRequestBody.mockRejectedValue(error);

         await expect(
            clientServerService.getByUrl({ url, schema: mockSchema })
         ).rejects.toThrow("URL processing failed");
         expect(mockRepoQueryFn).not.toHaveBeenCalled();
      });

      it("should throw an error if repo query fails for getByUrl", async () => {
         const error = new Error("DB error on getByUrl");
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
         mockRepoQueryFn.mockRejectedValue(error);

         await expect(
            clientServerService.getByUrl({ url, schema: mockSchema })
         ).rejects.toThrow("DB error on getByUrl");
      });
   });
});
