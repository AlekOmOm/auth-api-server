import { describe, it, expect, beforeEach, vi } from "vitest";
import clientServerService from "../clientServer.js";
import ClientServer from "../../models/ClientServer.js"; // Import for type checking if needed, and for fromDb

// Mock the Repo class and its query method
const mockRepoQuery = vi.fn();
vi.mock("../../repo/index.js", () => ({
   __esModule: true,
   default: vi.fn().mockImplementation(() => ({
      // Mocks Repo constructor
      query: mockRepoQuery, // Mocks Repo.prototype.query
   })),
}));

// Assuming ClientServer.fromRequestBody change is in place to handle string for lookup

describe("clientServerService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
      mockRepoQuery.mockClear();
   });

   describe("checkReferer", () => {
      const schema = "test_schema";

      it("should return registered URL when referer matches", async () => {
         const mockClientServerDbRow = {
            client_id: "client123",
            app_name: "Test Client",
            identifier_url: "https://client.com",
            entry_point_url: "https://client.com/entry",
            authorized_urls: ["https://client.com"],
            user_id: "user1",
            client_mode: "frontend-login-proxy",
            assigned_schema_name: "schema_test",
            client_secret_hash: "hash",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
         };
         // The service pipeline calls repo.query(operation, instance)
         // For checkReferer, operation is 'getByReferer'
         // The instance passed to repo.query is the result of ClientServer.fromRequestBody(refererUrl)
         // The result of repo.query is directly used as data in the pipeline response
         mockRepoQuery.mockResolvedValue(mockClientServerDbRow); // Simulate repo returning a single row object

         const result = await clientServerService.checkReferer({
            refererUrl: "https://client.com",
            schema,
         });

         expect(mockRepoQuery).toHaveBeenCalledWith(
            "getByReferer",
            expect.any(ClientServer)
         );
         const calledInstance = mockRepoQuery.mock.calls[0][1];
         expect(calledInstance.identifier_url).toBe("https://client.com"); // Check the instance passed

         expect(result.message).toBe("Client server retrieved successfully");
         // The pipeline returns the direct result of the executor, which is mockClientServerDbRow
         // This data should ideally be an instance of ClientServer after ClientServer.fromDb if the full flow worked
         // However, the current generic pipeline returns the raw executor result.
         // If the `fromDB` transformation was part of the pipeline for getters, this would be different.
         // For now, this matches the current pipeline structure:
         expect(result.data).toEqual(mockClientServerDbRow);
      });

      it("should return data from repo when referer is not registered (e.g., null or empty result)", async () => {
         // Simulate repo returning null (or whatever it returns for not found)
         mockRepoQuery.mockResolvedValue(null);

         const result = await clientServerService.checkReferer({
            refererUrl: "https://unregistered.com",
            schema,
         });

         expect(mockRepoQuery).toHaveBeenCalledWith(
            "getByReferer",
            expect.any(ClientServer)
         );
         expect(result.message).toBe("Client server retrieved successfully");
         expect(result.data).toBeNull(); // Assuming repo returns null if not found
      });

      it("should handle repository errors by throwing them", async () => {
         const error = new Error("Database error");
         mockRepoQuery.mockRejectedValue(error);

         await expect(
            clientServerService.checkReferer({
               refererUrl: "https://error.com",
               schema,
            })
         ).rejects.toThrow("Database error");
      });
   });
});
