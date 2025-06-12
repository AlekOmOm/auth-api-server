/**
 * Unit Tests for Detection Middleware
 * Tests the role detection and schema detection logic
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { detectUserRole } from "../detection.js";
import { USER_ROLES } from "../../utils/roles.js";

// Mock the session utilities
vi.mock("../../utils/request/index.js", () => ({
   default: {
      session: {
         getUserRole: vi.fn(),
         getUserId: vi.fn(),
         setObj: vi.fn(),
      },
   },
}));

import requestUtils from "../../utils/request/index.js";

describe("Detection Middleware Unit Tests", () => {
   let req, res, next;

   beforeEach(() => {
      req = {
         session: {},
      };
      res = {};
      next = vi.fn();
      vi.clearAllMocks();
   });

   describe("detectUserRole", () => {
      it("should not change role when role is already set", async () => {
         requestUtils.session.getUserRole.mockReturnValue("owner");

         await detectUserRole(req, res, next);

         expect(requestUtils.session.setObj).not.toHaveBeenCalled();
         expect(next).toHaveBeenCalled();
      });

      it("should set owner role when userId matches ownerId", async () => {
         const userId = "user-123";
         const ownerId = "user-123";

         requestUtils.session.getUserRole.mockReturnValue(null);
         requestUtils.session.getUserId.mockReturnValue(userId);
         req.session.ownerId = ownerId;

         await detectUserRole(req, res, next);

         expect(requestUtils.session.setObj).toHaveBeenCalledWith(req, {
            role: USER_ROLES.OWNER,
         });
         expect(next).toHaveBeenCalled();
      });

      it("should set user role when userId does not match ownerId", async () => {
         const userId = "user-123";
         const ownerId = "user-456";

         requestUtils.session.getUserRole.mockReturnValue(null);
         requestUtils.session.getUserId.mockReturnValue(userId);
         req.session.ownerId = ownerId;

         await detectUserRole(req, res, next);

         expect(requestUtils.session.setObj).toHaveBeenCalledWith(req, {
            role: USER_ROLES.USER,
         });
         expect(next).toHaveBeenCalled();
      });

      it("should set user role when ownerId is not set", async () => {
         const userId = "user-123";

         requestUtils.session.getUserRole.mockReturnValue(null);
         requestUtils.session.getUserId.mockReturnValue(userId);
         req.session.ownerId = null;

         await detectUserRole(req, res, next);

         expect(requestUtils.session.setObj).toHaveBeenCalledWith(req, {
            role: USER_ROLES.USER,
         });
         expect(next).toHaveBeenCalled();
      });

      it("should handle errors gracefully and call next", async () => {
         requestUtils.session.getUserRole.mockReturnValue(null);
         requestUtils.session.getUserId.mockImplementation(() => {
            throw new Error("Session error");
         });

         const consoleSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

         await detectUserRole(req, res, next);

         expect(consoleSpy).toHaveBeenCalledWith(
            "❌ Error detecting user role:",
            expect.any(Error)
         );
         expect(next).toHaveBeenCalled();

         consoleSpy.mockRestore();
      });
   });
});
