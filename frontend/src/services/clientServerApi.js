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
      // response is already { success: boolean, data?, message?, status?, errors? }
      return response;
   } catch (error) {
      // This catch is for network errors or other JS exceptions during the fetchGet call itself.
      console.error("Network or unexpected error in getClientServers:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while fetching client servers.",
         status: error.status || 0,
         data: [],
      };
   }
};

/**
 * Fetches a specific client server by ID for the authenticated user.
 * @param {string} clientId - The ID of the client server to fetch.
 * @returns {Promise<Object>} The result of the fetch operation.
 */
const getClientServer = async (clientId) => {
   if (!clientId) {
      return {
         success: false,
         message: "Client ID is required.",
         status: 400, // Client-side validation error
         data: null,
      };
   }
   try {
      const response = await fetchGet(
         `${BACKEND_URL_CLIENT_SERVER}/user/clients/${clientId}`
      );
      return response;
   } catch (error) {
      console.error("Network or unexpected error in getClientServer:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while fetching the client server.",
         status: error.status || 0,
         data: null,
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

      if (!response.success) {
         // Handle specific HTTP error statuses from the response object
         if (response.status === 401) {
            return {
               ...response, // Keep other error details like original message if any
               message:
                  response.message || "Authentication required. Please log in.",
               requiresAuth: true,
            };
         }
         if (response.status === 403) {
            return {
               ...response,
               message:
                  response.message ||
                  "Owner or admin privileges required to access statistics.",
               insufficientPrivileges: true,
            };
         }
         // For other errors, just return the structured error response from fetchGet
         return response;
      }
      // If successful, return the success response from fetchGet
      return response;
   } catch (error) {
      // This is for network/unexpected errors ONLY
      console.error("Network or unexpected error in getOwnerStats:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while fetching owner stats.",
         status: error.status || 0,
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
   if (!clientId) {
      return {
         success: false,
         message: "Client ID is required for deletion.",
         status: 400,
      };
   }
   try {
      const response = await fetchDelete(
         `${BACKEND_URL_CLIENT_SERVER}/user/clients/${clientId}`
      );

      if (!response.success) {
         if (response.status === 401) {
            return {
               ...response,
               message:
                  response.message || "Authentication required. Please log in.",
               requiresAuth: true,
            };
         }
         if (response.status === 403) {
            return {
               ...response,
               message:
                  response.message ||
                  "You can only delete client servers that you own.",
               insufficientPrivileges: true,
            };
         }
         return response;
      }
      return response;
   } catch (error) {
      console.error(
         "Network or unexpected error in deleteClientServer:",
         error
      );
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while deleting the client server.",
         status: error.status || 0,
      };
   }
};

/**
 * Creates a new client server.
 * @param {Object} clientData - The data for the new client server.
 * @returns {Promise<Object>} The result of the create operation.
 */
const createClientServer = async (clientData) => {
   try {
      const requestBody = {
         app_name: clientData.app_name,
         allowed_return_urls: clientData.authorized_urls || [],
      };

      const response = await fetchPost(
         `${BACKEND_URL_CLIENT_SERVER}/register`,
         requestBody
      );

      if (!response.success) {
         if (response.status === 401) {
            return {
               ...response,
               message:
                  response.message || "Authentication required. Please log in.",
               requiresAuth: true,
            };
         }
         // Potentially handle other specific statuses like 400 (validation errors) if needed
         // For now, return the structured error from fetchPost
         return response;
      }
      return response;
   } catch (error) {
      console.error(
         "Network or unexpected error in createClientServer:",
         error
      );
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while creating the client server.",
         status: error.status || 0,
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
   if (!clientId) {
      return {
         success: false,
         message: "Client ID is required for update.",
         status: 400,
      };
   }
   try {
      const response = await fetchPut(
         `${BACKEND_URL_CLIENT_SERVER}/user/clients/${clientId}`,
         clientData
      );

      if (!response.success) {
         if (response.status === 401) {
            return {
               ...response,
               message:
                  response.message || "Authentication required. Please log in.",
               requiresAuth: true,
            };
         }
         if (response.status === 403) {
            return {
               ...response,
               message:
                  response.message ||
                  "You can only update client servers that you own.",
               insufficientPrivileges: true,
            };
         }
         return response;
      }
      return response;
   } catch (error) {
      console.error(
         "Network or unexpected error in updateClientServer:",
         error
      );
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while updating the client server.",
         status: error.status || 0,
      };
   }
};

/**
 * Gets analytics for a specific client server.
 * @param {string} clientId - The ID of the client server.
 * @returns {Promise<Object>} The result of the analytics fetch operation.
 */
const getClientAnalytics = async (clientId) => {
   if (!clientId) {
      return {
         success: false,
         message: "Client ID is required for analytics.",
         status: 400,
         data: null,
      };
   }
   try {
      const response = await fetchGet(
         `${BACKEND_URL_OWNER}/clients/${clientId}/analytics`
      );

      if (!response.success) {
         if (response.status === 401) {
            return {
               ...response,
               message:
                  response.message || "Authentication required. Please log in.",
               requiresAuth: true,
            };
         }
         if (response.status === 403) {
            return {
               ...response,
               message:
                  response.message ||
                  "You can only view analytics for client servers that you own.",
               insufficientPrivileges: true,
            };
         }
         return response;
      }
      return response;
   } catch (error) {
      console.error(
         "Network or unexpected error in getClientAnalytics:",
         error
      );
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while fetching client analytics.",
         status: error.status || 0,
         data: null,
      };
   }
};

/**
 * Gets users for a specific client server.
 * @param {string} clientId - The ID of the client server.
 * @returns {Promise<Object>} The result of the users fetch operation.
 */
const getClientUsers = async (clientId) => {
   if (!clientId) {
      return {
         success: false,
         message: "Client ID is required to fetch users.",
         status: 400,
         data: [],
      };
   }
   try {
      const response = await fetchGet(
         `${BACKEND_URL_OWNER}/clients/${clientId}/users`
      );

      if (!response.success) {
         if (response.status === 401) {
            return {
               ...response,
               message:
                  response.message || "Authentication required. Please log in.",
               requiresAuth: true,
            };
         }
         if (response.status === 403) {
            return {
               ...response,
               message:
                  response.message ||
                  "You can only manage users for client servers that you own.",
               insufficientPrivileges: true,
            };
         }
         return response;
      }
      return response;
   } catch (error) {
      console.error("Network or unexpected error in getClientUsers:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while fetching client users.",
         status: error.status || 0,
         data: [],
      };
   }
};

/**
 * Creates a user for a specific client server.
 * @param {string} clientId - The ID of the client server.
 * @param {Object} userData - Data for the new user (name, email, password, role).
 * @returns {Promise<Object>} The result of the create operation.
 */
const createClientUser = async (clientId, userData) => {
   if (!clientId) {
      return { success: false, message: "Client ID is required.", status: 400 };
   }
   try {
      const response = await fetchPost(
         `${BACKEND_URL_OWNER}/clients/${clientId}/users`,
         userData
      );
      return response;
   } catch (error) {
      console.error("Network or unexpected error in createClientUser:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while creating the user.",
         status: error.status || 0,
      };
   }
};

/**
 * Updates a user for a specific client server.
 * @param {string} clientId - The ID of the client server.
 * @param {string} userId - The ID of the user to update.
 * @param {Object} userData - Data to update the user with.
 * @returns {Promise<Object>} The result of the update operation.
 */
const updateClientUser = async (clientId, userId, userData) => {
   if (!clientId || !userId) {
      return {
         success: false,
         message: "Client ID and User ID are required.",
         status: 400,
      };
   }
   try {
      const response = await fetchPut(
         `${BACKEND_URL_OWNER}/clients/${clientId}/users/${userId}`,
         userData
      );
      return response;
   } catch (error) {
      console.error("Network or unexpected error in updateClientUser:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while updating the user.",
         status: error.status || 0,
      };
   }
};

/**
 * Deletes a user from a specific client server.
 * @param {string} clientId - The ID of the client server.
 * @param {string} userId - The ID of the user to delete.
 * @returns {Promise<Object>} The result of the delete operation.
 */
const deleteClientUser = async (clientId, userId) => {
   if (!clientId || !userId) {
      return {
         success: false,
         message: "Client ID and User ID are required.",
         status: 400,
      };
   }
   try {
      const response = await fetchDelete(
         `${BACKEND_URL_OWNER}/clients/${clientId}/users/${userId}`
      );
      return response;
   } catch (error) {
      console.error("Network or unexpected error in deleteClientUser:", error);
      return {
         success: false,
         message:
            error.message ||
            "A network or unexpected error occurred while deleting the user.",
         status: error.status || 0,
      };
   }
};

const clientServerApi = {
   getClientServers,
   getClientServer,
   getOwnerStats,
   deleteClientServer,
   createClientServer,
   updateClientServer,
   getClientAnalytics,
   getClientUsers,
   createClientUser,
   updateClientUser,
   deleteClientUser,
};

export default clientServerApi;
