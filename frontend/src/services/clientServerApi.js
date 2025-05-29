import { fetchGet, fetchPost, fetchPut, fetchDelete } from "../util/fetch";

const BACKEND_URL_CLIENT_SERVER = "/api/clientServer";
const BACKEND_URL_OWNER = "/api/owner";

/**
 * Fetches all client servers for the authenticated user.
 * @returns {Promise<Object>} The result of the fetch operation.
 */
const getClientServers = async () => {
   try {
      const response = await fetchGet(
         `${BACKEND_URL_CLIENT_SERVER}/user/clients`
      );
      return response;
   } catch (error) {
      console.error("Error in getClientServers:", error);
      // Return a consistent error object structure as expected by fetch.js error handling
      return {
         success: false,
         message: error.message || "Failed to fetch client servers.",
         data: [],
      };
   }
};

/**
 * Fetches owner statistics.
 * @returns {Promise<Object>} The result of the fetch operation.
 */
const getOwnerStats = async () => {
   try {
      const response = await fetchGet(`${BACKEND_URL_OWNER}/stats`);
      return response;
   } catch (error) {
      console.error("Error in getOwnerStats:", error);
      return {
         success: false,
         message: error.message || "Failed to fetch owner stats.",
         data: null,
      };
   }
};

/**
 * Deletes a specific client server.
 * @param {string} clientId - The ID of the client server to delete.
 * @returns {Promise<Object>} The result of the delete operation.
 */
const deleteClientServer = async (clientId) => {
   try {
      if (!clientId) {
         return {
            success: false,
            message: "Client ID is required for deletion.",
         };
      }
      const response = await fetchDelete(
         `${BACKEND_URL_CLIENT_SERVER}/user/clients/${clientId}`
      );
      return response;
   } catch (error) {
      console.error("Error in deleteClientServer:", error);
      return {
         success: false,
         message: error.message || "Failed to delete client server.",
      };
   }
};

/**
 * Creates a new client server for the logged-in user.
 * @param {Object} clientData - The data for the new client server (e.g., { app_name, allowed_return_urls }).
 * @returns {Promise<Object>} The result of the create operation.
 */
const createClientServer = async (clientData) => {
   try {
      // Endpoint corrected based on backend/src/routes/clientServer.js
      const response = await fetchPost(
         `${BACKEND_URL_CLIENT_SERVER}/user/register`,
         clientData
      );
      return response;
   } catch (error) {
      console.error("Error in createClientServer:", error);
      return {
         success: false,
         message: error.message || "Failed to create client server.",
      };
   }
};

/**
 * Updates an existing client server.
 * @param {string} clientId - The ID of the client server to update.
 * @param {Object} clientData - The data to update the client server with.
 * @returns {Promise<Object>} The result of the update operation.
 */
const updateClientServer = async (clientId, clientData) => {
   try {
      if (!clientId) {
         return {
            success: false,
            message: "Client ID is required for update.",
         };
      }
      const response = await fetchPut(
         `${BACKEND_URL_CLIENT_SERVER}/user/clients/${clientId}`,
         clientData
      );
      return response;
   } catch (error) {
      console.error("Error in updateClientServer:", error);
      return {
         success: false,
         message: error.message || "Failed to update client server.",
      };
   }
};

const clientServerApi = {
   getClientServers,
   getOwnerStats,
   deleteClientServer,
   createClientServer,
   updateClientServer,
};

export default clientServerApi;
