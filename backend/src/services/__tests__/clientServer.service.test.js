const mockFromRequestBody = jest.fn();
const mockClientServerUpdate = jest.fn();
const mockToDB = jest.fn((instance) => instance); // Simple pass-through

jest.mock("../../models/ClientServer.js", () => ({
   __esModule: true,
   default: {
      fromRequestBody: mockFromRequestBody,
      update: mockClientServerUpdate,
   },
}));

// Add this mock for User.js
jest.mock("../models/User.js", () => ({
   __esModule: true,
   default: jest.fn().mockImplementation(() => ({
      // Mock any instance methods if needed later
   })),
   UserOperations: {
      // Mock UserOperations if they are indirectly used
      toDB: jest.fn((userInstance) => ({
         ...userInstance,
         preparedForDb: true,
      })),
      fromDB: jest.fn((dbRow) => ({ ...dbRow, hydratedFromDb: true })),
   },
}));

// Mock for repo/connection/queries/index.js
const mockRepoInternalQueryFn = jest.fn();
jest.mock("../repo/connection/queries/index.js", () => ({
   __esModule: true,
   default: mockRepoInternalQueryFn,
   operations: {},
}));

// Mock for DDL/client_servers.js (now virtual)
jest.mock(
   "virtual-ddl-client-servers",
   () => ({
      __esModule: true,
      CREATE_CLIENT_SERVERS_TABLE: "mock DDL string",
      default: "mock DDL default string",
   }),
   { virtual: true }
);

// Mock for DDL/users_sessions.js (now virtual)
jest.mock(
   "virtual-ddl-users-sessions",
   () => ({
      __esModule: true,
      CREATE_USERS_TABLE: "mock DDL string",
      CREATE_SESSIONS_TABLE: "mock DDL string",
      default: "mock DDL default string for users_sessions",
   }),
   { virtual: true }
);

// Mock for pools/clientServers.js
const mockGetPoolForClientSchema = jest.fn();
jest.mock("../repo/connection/pools/clientServers.js", () => ({
   __esModule: true,
   getPoolForSchema: mockGetPoolForClientSchema,
   // default: mockGetPoolForClientSchema, // If it's a default export
}));

const mockRepoQueryFn = jest.fn();
jest.mock("../repo/index.js", () => {
   return jest.fn().mockImplementation(() => ({
      query: mockRepoQueryFn,
   }));
});

jest.mock("../models/functional/index.js", () => ({
   __esModule: true,
   toDB: mockToDB,
}));

import clientServerService from "../clientServer.js";
import ClientServer from "../models/ClientServer.js"; // Mocked
import Repo from "../repo/index.js"; // Mocked
import { toDB } from "../models/functional/index.js"; // Mocked

describe("clientServerService", () => {
   const mockSchema = "test_schema";

   beforeEach(() => {
      jest.clearAllMocks();
   });

   describe("register", () => {
      const clientServerData = { name: "Test App" };
      const userId = "user123";
      const mockInstance = { id: "client1", ...clientServerData, userId };
      const mockRepoResult = {
         ...mockInstance,
         created_at: new Date().toISOString(),
      };

      it("should register a new client server successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
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
         expect(toDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenCalledWith("create", mockInstance);
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
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance);
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
      const mockInstance = { userId }; // Simplified instance for this context
      const mockRepoResult = [{ id: "client1" }, { id: "client2" }];

      it("should get user client servers successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance); // fromRequestBody expects userId
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.getUserClientServers({
            userId,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(userId);
         expect(toDB).toHaveBeenCalledWith(mockInstance);
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
         expect(toDB).toHaveBeenCalledWith(mockInstance);
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
      }; // Mock return of ClientServer.update
      const instanceForFirstCall = { userId, clientId }; // Used for fromRequestBody in first pipeline
      const instanceForSecondCall = updatedInstanceDataFromModel; // Used for fromRequestBody in second pipeline
      const mockRepoResultUpdate = {
         ...updatedInstanceDataFromModel,
         updated_at: new Date().toISOString(),
      };

      it("should update client server successfully", async () => {
         // Mocking sequence for the two pipeline calls within updateUserClientServer
         // 1. First pipeline call (get existing)
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForFirstCall
         ); // For getByUserIdAndClientId
         toDB.mockReturnValueOnce(instanceForFirstCall); // Transformed instance for get
         mockRepoQueryFn.mockResolvedValueOnce(existingClientServerData); // Repo result for get

         // Mock ClientServer.update static method
         ClientServer.update.mockReturnValue(updatedInstanceDataFromModel);

         // 2. Second pipeline call (update)
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForSecondCall
         ); // For update, arg is result of ClientServer.update
         toDB.mockReturnValueOnce(instanceForSecondCall); // Transformed instance for update
         mockRepoQueryFn.mockResolvedValueOnce(mockRepoResultUpdate); // Repo result for update

         const result = await clientServerService.updateUserClientServer({
            userId,
            clientId,
            updateData,
            schema: mockSchema,
         });

         // Assertions for first pipeline call (implicit)
         expect(ClientServer.fromRequestBody).toHaveBeenNthCalledWith(
            1,
            userId,
            clientId
         );
         expect(toDB).toHaveBeenNthCalledWith(1, instanceForFirstCall);
         expect(Repo).toHaveBeenNthCalledWith(1, mockSchema, "client_servers");
         expect(mockRepoQueryFn).toHaveBeenNthCalledWith(
            1,
            "getByUserIdAndClientId",
            instanceForFirstCall
         );

         // Assertion for ClientServer.update
         expect(ClientServer.update).toHaveBeenCalledWith(
            updateData,
            existingClientServerData
         );

         // Assertions for second pipeline call
         expect(ClientServer.fromRequestBody).toHaveBeenNthCalledWith(
            2,
            updatedInstanceDataFromModel
         );
         expect(toDB).toHaveBeenNthCalledWith(2, instanceForSecondCall); // instanceForSecondCall is updatedInstanceDataFromModel
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
         ); // For getByUserIdAndClientId args
         toDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockRejectedValueOnce(error); // Fail the first repo call

         await expect(
            clientServerService.updateUserClientServer({
               userId,
               clientId,
               updateData,
               schema: mockSchema,
            })
         ).rejects.toThrow("Get existing failed");

         expect(ClientServer.update).not.toHaveBeenCalled();
         expect(mockRepoQueryFn).toHaveBeenCalledTimes(1); // Only the first call
      });

      it("should throw if ClientServer.update fails (conceptually, if it threw, pipeline would catch if fromRequestBody fails with its result)", async () => {
         // This tests if the second pipeline fails due to fromRequestBody.
         // If ClientServer.update itself throws, it's not caught by pipeline directly but would bubble up.
         // Assuming ClientServer.update returns data that makes fromRequestBody fail.
         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForFirstCall
         );
         toDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockResolvedValueOnce(existingClientServerData);

         ClientServer.update.mockReturnValue(updatedInstanceDataFromModel);

         const updateError = new Error("Update validation failed");
         ClientServer.fromRequestBody.mockRejectedValueOnce(updateError); // Fail on second fromRequestBody

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
         expect(mockRepoQueryFn).toHaveBeenCalledTimes(1); // Only the first repo call for get succeeded.
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
         toDB.mockReturnValueOnce(instanceForFirstCall);
         mockRepoQueryFn.mockResolvedValueOnce(existingClientServerData);

         ClientServer.update.mockReturnValue(updatedInstanceDataFromModel);

         ClientServer.fromRequestBody.mockResolvedValueOnce(
            instanceForSecondCall
         );
         toDB.mockReturnValueOnce(instanceForSecondCall);
         const updateDbError = new Error("Update DB error");
         mockRepoQueryFn.mockRejectedValueOnce(updateDbError); // Fail the second repo call

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
         expect(toDB).toHaveBeenCalledWith(mockInstance);
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
         expect(toDB).toHaveBeenCalledWith(mockInstance);
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
         expect(toDB).toHaveBeenCalledWith(mockInstance);
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
      const mockInstance = { url }; // Argument to fromRequestBody will be the url
      const mockRepoResult = { id: "client1", identifier_url: url };

      it("should get client server by URL successfully", async () => {
         ClientServer.fromRequestBody.mockResolvedValue(mockInstance); // Simulating fromRequestBody takes the url
         mockRepoQueryFn.mockResolvedValue(mockRepoResult);

         const result = await clientServerService.getByUrl({
            url,
            schema: mockSchema,
         });

         expect(ClientServer.fromRequestBody).toHaveBeenCalledWith(url);
         expect(toDB).toHaveBeenCalledWith(mockInstance);
         expect(Repo).toHaveBeenCalledWith(mockSchema, "client_servers");
         // The service uses "getByReferer" query for getByUrl as well
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
