import { describe, it, expect } from "vitest";
import hashing from "../hashing.js";
import bcrypt from "bcryptjs";

describe("hashing utility", () => {
   const testPassword = "mySecurePassword123!";

   describe("hashing.hash()", () => {
      it("should return a string", () => {
         const hashedPassword = hashing.hash(testPassword);
         expect(typeof hashedPassword).toBe("string");
      });

      it("should return a hash that is different from the original password", () => {
         const hashedPassword = hashing.hash(testPassword);
         expect(hashedPassword).not.toBe(testPassword);
      });

      it("should produce a valid bcrypt hash which bcrypt can compare", () => {
         const hashedPassword = hashing.hash(testPassword);
         // Bcrypt hashes typically start with $2a$, $2b$, or $2y$, followed by cost factor and hash
         expect(hashedPassword).toMatch(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/);
         // Verify that bcrypt itself can compare the generated hash
         const isMatch = bcrypt.compareSync(testPassword, hashedPassword);
         expect(isMatch).toBe(true);
      });

      it("should produce different hashes for the same password if called multiple times (due to salting)", () => {
         const hashedPassword1 = hashing.hash(testPassword);
         const hashedPassword2 = hashing.hash(testPassword);
         expect(hashedPassword1).not.toBe(hashedPassword2);
         // Both should still be valid for the same password
         expect(bcrypt.compareSync(testPassword, hashedPassword1)).toBe(true);
         expect(bcrypt.compareSync(testPassword, hashedPassword2)).toBe(true);
      });
   });

   describe("hashing.same()", () => {
      let hashedPassword;

      beforeEach(() => {
         // Generate a fresh hash for each test in this describe block
         hashedPassword = hashing.hash(testPassword);
      });

      it("should return true for a correct password and its hash", () => {
         const isMatch = hashing.same(testPassword, hashedPassword);
         expect(isMatch).toBe(true);
      });

      it("should return false for an incorrect password and a valid hash", () => {
         const incorrectPassword = "wrongPassword";
         const isMatch = hashing.same(incorrectPassword, hashedPassword);
         expect(isMatch).toBe(false);
      });

      it("should return false if the hash is malformed or not a bcrypt hash", () => {
         const malformedHash = "not-a-bcrypt-hash";
         const isMatch = hashing.same(testPassword, malformedHash);
         expect(isMatch).toBe(false);
      });

      it("should return false if the password is correct but hash is for a different password", () => {
         const differentPassword = "anotherSecurePassword456?";
         const differentHash = hashing.hash(differentPassword);
         const isMatch = hashing.same(testPassword, differentHash);
         expect(isMatch).toBe(false);
      });

      it("should handle empty password string correctly (comparison)", () => {
         const emptyPassword = "";
         const hashedEmptyPassword = hashing.hash(emptyPassword);
         expect(hashing.same(emptyPassword, hashedEmptyPassword)).toBe(true);
         expect(hashing.same(testPassword, hashedEmptyPassword)).toBe(false);
      });

      it("should return false when comparing against an empty string hash", () => {
         const isMatch = hashing.same(testPassword, "");
         expect(isMatch).toBe(false);
      });
   });
});
