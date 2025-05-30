import { describe, it, expect, beforeEach, vi } from "vitest";
import clientServerService from "../clientServer.js";

// Mock dependencies
vi.mock("../../repo/repositories/authInternal/repository.js", () => ({
   getClientServerByReferer: vi.fn(),
}));

// Import mocked modules
import * as clientServerRepo from "../../repo/repositories/authInternal/repository.js";

describe("clientServerService", () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe("checkReferer", () => {
      it("should return registered URL when referer matches", async () => {
         const mockClientServer = {
            id: "client123",
            name: "Test Client",
            redirect_url: "https://client.com",
            user_id: 1,
         };

         clientServerRepo.getClientServerByReferer.mockResolvedValue(
            mockClientServer
         );

         const result = await clientServerService.checkReferer({
            refererUrl: "https://client.com",
         });

         expect(clientServerRepo.getClientServerByReferer).toHaveBeenCalledWith(
            "https://client.com"
         );
         expect(result).toEqual({
            message: "Referer URL is a registered URL",
            data: mockClientServer,
         });
      });

      it("should return null when referer is not registered", async () => {
         clientServerRepo.getClientServerByReferer.mockResolvedValue(null);

         const result = await clientServerService.checkReferer({
            refererUrl: "https://unregistered.com",
         });

         expect(clientServerRepo.getClientServerByReferer).toHaveBeenCalledWith(
            "https://unregistered.com"
         );
         expect(result).toEqual({
            message: "Referer URL is not a registered URL",
            data: null,
         });
      });

      it("should handle repository errors", async () => {
         const error = new Error("Database error");
         clientServerRepo.getClientServerByReferer.mockRejectedValue(error);

         await expect(
            clientServerService.checkReferer({
               refererUrl: "https://error.com",
            })
         ).rejects.toThrow("Database error");
      });

      it("should handle empty referer URL", async () => {
         clientServerRepo.getClientServerByReferer.mockResolvedValue(null);

         const result = await clientServerService.checkReferer({
            refererUrl: "",
         });

         expect(clientServerRepo.getClientServerByReferer).toHaveBeenCalledWith(
            ""
         );
         expect(result.data).toBeNull();
      });

      it("should handle referer URLs with query parameters", async () => {
         const mockClientServer = {
            id: "client456",
            name: "Client With Params",
            redirect_url: "https://app.com?param=value",
         };

         clientServerRepo.getClientServerByReferer.mockResolvedValue(
            mockClientServer
         );

         const result = await clientServerService.checkReferer({
            refererUrl: "https://app.com?param=value",
         });

         expect(result.data).toEqual(mockClientServer);
      });
   });
});
