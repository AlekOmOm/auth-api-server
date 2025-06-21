import { v4 as uuidv4 } from "uuid";

/**
 * Generates a v4 UUID.
 * @returns {string} A new v4 UUID.
 */
export function generateUuidV4() {
   return uuidv4();
}

export default {
   generateUuidV4,
};
