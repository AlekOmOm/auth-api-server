/**
 * Unit Tests for Authentication Middleware
 * Tests individual middleware functions for authentication and authorization
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
   isAuthenticated,
   isAdmin,
   isOwner,
   isAdminOrOwner,
   hasRole,
   isNotAdmin,
} from "../auth.js";

describe("Authentication Middleware Unit Tests", () => {
   let req, res, next;

   beforeEach(() => {
      req = {
         session: {},
      };
      res = {
         status: vi.fn().mockReturnThis(),
         json: vi.fn().mockReturnThis(),
      };
      next = vi.fn();
   });

   describe("isAuthenticated", () => {
      it("should call next() when user is authenticated", () => {
         req.session = {
            userId: "user-123",
            isAuthenticated: true,
         };

         isAuthenticated(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return 401 when user is not authenticated", () => {
         req.session = {};

         isAuthenticated(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Authentication required",
         });
         expect(next).not.toHaveBeenCalled();
      });

      it("should return 401 when session does not exist", () => {
         req.session = null;

         isAuthenticated(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Authentication required",
         });
         expect(next).not.toHaveBeenCalled();
      });
   });

   describe("isAdmin", () => {
      it("should return true when user role is admin", () => {
         req.session.role = "admin";

         const result = isAdmin(req);

         expect(result).toBe(true);
      });

      it("should return false when user role is not admin", () => {
         req.session.role = "user";

         const result = isAdmin(req);

         expect(result).toBe(false);
      });

      it("should return false when role is undefined", () => {
         req.session = {};

         const result = isAdmin(req);

         expect(result).toBe(false);
      });
   });

   describe("isOwner", () => {
      it("should return true when user role is owner", () => {
         req.session.role = "owner";

         const result = isOwner(req);

         expect(result).toBe(true);
      });

      it("should return false when user role is not owner", () => {
         req.session.role = "user";

         const result = isOwner(req);

         expect(result).toBe(false);
      });

      it("should return false when role is undefined", () => {
         req.session = {};

         const result = isOwner(req);

         expect(result).toBe(false);
      });
   });

   describe("isAdminOrOwner", () => {
      it("should call next() when user is admin", () => {
         req.session.role = "admin";

         isAdminOrOwner(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should call next() when user is owner", () => {
         req.session.role = "owner";

         isAdminOrOwner(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return 401 when user is neither admin nor owner", () => {
         req.session.role = "user";

         isAdminOrOwner(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Insufficient permissions",
         });
         expect(next).not.toHaveBeenCalled();
      });

      it("should return 401 when role is undefined", () => {
         req.session = {};

         isAdminOrOwner(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Insufficient permissions",
         });
         expect(next).not.toHaveBeenCalled();
      });
   });

   describe("hasRole", () => {
      it("should call next() when user has the required role", () => {
         req.session = {
            userId: "user-123",
            role: "owner",
         };

         const middleware = hasRole("owner");
         middleware(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should call next() when user is admin (regardless of required role)", () => {
         req.session = {
            userId: "user-123",
            role: "admin",
         };

         const middleware = hasRole("owner");
         middleware(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return 401 when user does not have required role", () => {
         req.session = {
            userId: "user-123",
            role: "user",
         };

         const middleware = hasRole("owner");
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Insufficient permissions",
         });
         expect(next).not.toHaveBeenCalled();
      });

      it("should return 401 when user is not authenticated", () => {
         req.session = {};

         const middleware = hasRole("owner");
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Authentication required",
         });
         expect(next).not.toHaveBeenCalled();
      });

      it("should return 401 when session does not exist", () => {
         req.session = null;

         const middleware = hasRole("owner");
         middleware(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Authentication required",
         });
         expect(next).not.toHaveBeenCalled();
      });
   });

   describe("isNotAdmin", () => {
      it("should call next() when user is not admin", () => {
         req.session.role = "user";

         isNotAdmin(req, res, next);

         expect(next).toHaveBeenCalled();
         expect(res.status).not.toHaveBeenCalled();
      });

      it("should return 401 when user is admin", () => {
         req.session.role = "admin";

         isNotAdmin(req, res, next);

         expect(res.status).toHaveBeenCalledWith(401);
         expect(res.json).toHaveBeenCalledWith({
            message: "Only for current user. Data protected",
         });
         expect(next).not.toHaveBeenCalled();
      });
   });
});
