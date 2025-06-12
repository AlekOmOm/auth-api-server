import { describe, it, expect } from "vitest";
import { generateUuidV4 } from "../uuid.js";

describe("generateUuidV4", () => {
   it("should return a string", () => {
      expect(typeof generateUuidV4()).toBe("string");
   });

   it("should return a valid v4 UUID", () => {
      const uuid = generateUuidV4();
      // Regex for v4 UUID: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      // where y is one of 8, 9, A, or B
      const uuidV4Regex =
         /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidV4Regex);
   });

   it("should return a string of 36 characters (standard UUID length)", () => {
      expect(generateUuidV4().length).toBe(36);
   });

   it("should return unique UUIDs on subsequent calls", () => {
      const uuid1 = generateUuidV4();
      const uuid2 = generateUuidV4();
      expect(uuid1).not.toBe(uuid2);
   });

   it('should contain the v4 identifier "-4" at the correct position', () => {
      const uuid = generateUuidV4();
      expect(uuid[14]).toBe("4");
   });
});
