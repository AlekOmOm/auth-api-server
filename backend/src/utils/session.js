import { POOL_CONTEXTS } from "./pool";

/**
 * retrieve userId from session
 */
export function getUserId(session) {
   try {
      const userId = session?.userId;
      if (!userId) {
         throw new ValidationError("User ID is required");
      }
      return userId;
   } catch (error) {
      throw error;
   }
}

/**
 * retrieve clientId from session
 */
export function getClientId(session) {
   try {
      const clientId = session?.clientId;
      if (!clientId) {
         throw new ValidationError("Client ID is required");
      }
      return clientId;
   } catch (error) {
      throw error;
   }
}

/**
 * retrieve clientSecretHash from session
 */
export function getClientSecretHash(session) {
   return session?.clientSecretHash;
}

/**
 * retrieve schema from session
 */
export function getSchema(session) {
   return session?.schema;
}

/**
 * retrieve clientMode from session
 */
export function getClientMode(session) {
   return session?.clientMode;
}
