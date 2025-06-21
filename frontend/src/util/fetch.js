const VITE_BACKEND_URL_BASE =
   import.meta.env.VITE_BACKEND_URL_BASE || "http://localhost:3001";
// Log these values at module load time to see what Vitest provides
// console.log(
//    "[FETCH_UTIL_CONFIG] import.meta.env.VITEST:",
//    import.meta.env.VITEST
// );
// console.log(
//    "[FETCH_UTIL_CONFIG] VITE_BACKEND_URL_BASE (initial):",
//    VITE_BACKEND_URL_BASE
// );
// const FRONTEND_BASE_URL = "http://localhost:3000"; // Define frontend base URL for context determination

function getMessageFromHtmlError(htmlContent, status) {
   let title = "";
   try {
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
         title = titleMatch[1].trim();
      }
   } catch (e) {
      // Silently ignore if title parsing fails, fallback to status-based messages
   }

   // Prioritize specific, short, non-generic titles if available
   if (
      title &&
      title.length > 0 &&
      title.length < 100 &&
      title.toLowerCase() !== "error" &&
      !title.toLowerCase().startsWith("http") && // Avoid URL as title
      title.toLowerCase() !== "problem filtering attribute" && // Example of a non-useful title
      title.toLowerCase() !== "nginx" && // Another common non-useful title
      !/^\d{3} /.test(title) &&
      title !== "Error Page"
   ) {
      // Avoid titles that are just status codes like "404 Not Found" if we generate a better one
      return title; // Use the extracted title if it seems specific and useful
   }

   // Fallback to status-based messages if title is not good or not found
   return getMessageFromHttpStatus(status); // Use new helper
}

function getMessageFromHttpStatus(status) {
   switch (status) {
      case 400:
         return "The server could not understand the request due to invalid syntax."; // More descriptive
      case 401:
         return "Authentication failed. Please check your credentials or log in."; // More descriptive
      case 403:
         return "You do not have permission to access this resource."; // More descriptive
      case 404:
         return "The requested resource was not found on the server."; // More descriptive
      case 500:
         return "An unexpected error occurred on the server. Please try again later."; // More descriptive
      case 502:
         return "The server received an invalid response from an upstream server. Please try again later."; // More descriptive
      case 503:
         return "The service is temporarily unavailable. Please try again later."; // More descriptive
      default:
         return `An unexpected HTTP error occurred (Status: ${status}). Please try again.`; // More descriptive
   }
}

function resolveUrl(url) {
   // console.log("[resolveUrl] Input URL:", url);
   // console.log(
   //    "[resolveUrl] import.meta.env.VITEST check:",
   //    import.meta.env.VITEST
   // );
   // console.log(
   //    "[resolveUrl] VITE_BACKEND_URL_BASE check:",
   //    VITE_BACKEND_URL_BASE
   // );
   if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
   }
   return url.startsWith("/")
      ? `${VITE_BACKEND_URL_BASE}${url}`
      : `${VITE_BACKEND_URL_BASE}/${url}`;
}

export async function fetchGet(url, fetchOptions = {}) {
   const fullUrl = resolveUrl(url);
   const headers = fetchOptions.headers || {}; // Preserve other headers if passed

   // console.log(`[fetchGet] Attempting GET: ${fullUrl}`);
   try {
      const response = await fetch(fullUrl, {
         ...fetchOptions, // Spread other fetch options
         credentials: "include",
         headers: headers,
      });
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
         let message;
         let errorDetails = null; // To store original error if needed for debugging, but not for display

         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               `fetchGet: Server returned an HTML error page. Status: ${response.status}. Content snippet:`,
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            message = getMessageFromHtmlError(errorHtml, response.status); // Already uses getMessageFromHttpStatus indirectly
            errorDetails = {
               _isHtmlError: true,
               raw: errorHtml.substring(0, 200),
            };
         } else if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorDetails = errorData; // Store original JSON error
            if (
               errorData &&
               typeof errorData.message === "string" &&
               errorData.message.length < 200 &&
               !errorData.message.toLowerCase().includes("stacktrace")
            ) {
               message = errorData.message; // Use backend JSON message if simple
            } else {
               message = getMessageFromHttpStatus(response.status); // Fallback for complex/missing JSON message
            }
         } else {
            const errorText = await response.text();
            console.error(
               `fetchGet: API error (${response.status}):`,
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            message = getMessageFromHttpStatus(response.status); // Use generic message for other text errors
            errorDetails = { raw: errorText.substring(0, 200) };
         }
         return {
            message: message,
            success: false,
            status: response.status,
            errorDetails: errorDetails, // Optional: for logging/debugging in service layer if needed
         };
      }

      // Handle successful responses
      if (contentType && contentType.includes("application/json")) {
         const responseData = await response.json();
         // Ensure success:true is part of the successful response if not already present
         if (typeof responseData === "object" && responseData !== null) {
            if (responseData.success === undefined) {
               responseData.success = true;
            }
         } else {
            // Wrap non-object successful responses
            return {
               success: true,
               data: responseData,
               status: response.status,
            };
         }
         return responseData;
      } else {
         const text = await response.text();
         console.warn(
            "fetchGet: API returned non-JSON success response. Content-Type:",
            contentType,
            "Body snippet:",
            text.substring(0, 200) + (text.length > 200 ? "..." : "")
         );
         // For GET, a non-JSON success response is unexpected.
         // Return it as data but flag that it was unexpected or handle as an error.
         // For now, let's treat it as an error because the service layer expects JSON.
         return {
            message: `API returned an unexpected response format. Expected JSON but received ${
               contentType || "unknown"
            }. Check console for details.`,
            success: false, // Treat as failure if not JSON
            status: response.status, // Include status, even if 2xx but wrong format
            data_received:
               text.substring(0, 200) + (text.length > 200 ? "..." : ""),
         };
      }
   } catch (error) {
      // This catch block now primarily handles network errors or errors from fetch() itself
      console.error("fetchGet error (outer catch):", error);
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
         // status code might not be available here if it's a pre-response network error
      };
   }
}

export async function fetchPost(url, body, fetchOptions = {}) {
   const fullUrl = resolveUrl(url);
   const headers = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {}), // Preserve other headers if passed
   };

   // console.log("🔍 [FETCH] fetchPost called");
   // console.log("🔍 [FETCH] Original URL for POST:", url);
   // console.log("🔍 [FETCH] Resolved URL for POST:", fullUrl);
   // console.log("🔍 [FETCH] Request body:", body);

   try {
      // console.log("🔍 [FETCH] Making fetch request to:", fullUrl);
      const response = await fetch(fullUrl, {
         ...fetchOptions, // Spread other fetch options
         method: "POST",
         credentials: "include",
         headers: headers,
         body: JSON.stringify(body),
      });

      // console.log("🔍 [FETCH] Fetch response received");
      // console.log("🔍 [FETCH] Response status:", response.status);
      // console.log("🔍 [FETCH] Response ok:", response.ok);
      // console.log(
      //    "🔍 [FETCH] Response headers:",
      //    Object.fromEntries(response.headers.entries())
      // );

      const contentType = response.headers.get("content-type");
      let responseData; // Will hold parsed body (JSON or text)
      let finalMessage; // Will hold the user-friendly message for errors
      let errorDetails = null; // To store original error context

      if (!response.ok) {
         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               "fetchPost: Server returned an HTML error page. Status:",
               response.status,
               "Content snippet:",
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            finalMessage = getMessageFromHtmlError(errorHtml, response.status);
            errorDetails = {
               _isHtmlError: true,
               raw: errorHtml.substring(0, 200),
            };
         } else if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
            errorDetails = responseData;
            if (
               responseData &&
               typeof responseData.message === "string" &&
               responseData.message.length < 200 &&
               !responseData.message.toLowerCase().includes("stacktrace")
            ) {
               finalMessage = responseData.message;
            } else {
               finalMessage = getMessageFromHttpStatus(response.status);
            }
         } else {
            // Non-JSON, non-HTML error
            const errorText = await response.text();
            console.warn(
               "fetchPost: Received non-JSON, non-HTML error. Status:",
               response.status,
               "Content snippet:",
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            finalMessage = getMessageFromHttpStatus(response.status);
            errorDetails = { raw: errorText.substring(0, 200) };
         }

         // Construct consistent error object
         const errorResponse = {
            message: finalMessage,
            success: false,
            status: response.status,
            errorDetails: errorDetails,
         };
         // If original error was JSON and had other properties, spread them cautiously
         // avoiding overwriting standardized fields.
         if (
            contentType &&
            contentType.includes("application/json") &&
            typeof responseData === "object" &&
            responseData !== null
         ) {
            for (const key in responseData) {
               if (
                  key !== "message" &&
                  key !== "success" &&
                  key !== "status" &&
                  key !== "errorDetails"
               ) {
                  errorResponse[key] = responseData[key];
               }
            }
         }
         return errorResponse;
      } else {
         // Response.ok is true
         // Try to parse as JSON first, as that's the expected success format
         if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
         } else {
            // If not JSON, still try to get text, might be a 204 No Content or unexpected success format
            responseData = await response.text();
            if (response.status === 204 || responseData === "") {
               // Handle 204 No Content
               return {
                  success: true,
                  status: response.status,
                  data: null,
                  message: "Operation successful (No Content)",
               };
            }
            // If it's a 2xx but not JSON and not empty, it's unusual for POST.
            // Wrap it but service layer should be aware.
            console.warn(
               "fetchPost: Received non-JSON success response. Status:",
               response.status,
               "Content snippet:",
               responseData.substring(0, 200)
            );
            return {
               success: true,
               status: response.status,
               data: responseData,
               message: "Operation successful but response was not JSON.",
            };
         }
      }

      // For successful JSON responses
      if (typeof responseData === "object" && responseData !== null) {
         if (responseData.success === undefined) {
            responseData.success = true; // Ensure success field
         }
         // ensure status is present
         if (responseData.status === undefined) {
            responseData.status = response.status;
         }
      } else {
         // Should ideally not happen if Content-Type was application/json and parsed
         responseData = {
            success: true,
            data: responseData,
            status: response.status,
         };
      }
      return responseData;
   } catch (error) {
      console.error("🔍 [FETCH] fetchPost error (outer catch):", error);
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
         // status: error.status || 0 // Status might not be available on network errors
      };
   }
}

export async function fetchPut(url, body, fetchOptions = {}) {
   const fullUrl = resolveUrl(url);
   const headers = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {}), // Preserve other headers if passed
   };

   // console.log(`[fetchPut] Attempting PUT: ${fullUrl}`);
   try {
      const response = await fetch(fullUrl, {
         ...fetchOptions, // Spread other fetch options
         method: "PUT",
         credentials: "include",
         headers: headers,
         body: JSON.stringify(body),
      });
      const contentType = response.headers.get("content-type");
      let responseData;
      let finalMessage;
      let errorDetails = null;

      if (!response.ok) {
         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               `fetchPut: Server returned an HTML error page. Status: ${response.status}. Content snippet:`,
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            finalMessage = getMessageFromHtmlError(errorHtml, response.status);
            errorDetails = {
               _isHtmlError: true,
               raw: errorHtml.substring(0, 200),
            };
         } else if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
            errorDetails = responseData;
            if (
               responseData &&
               typeof responseData.message === "string" &&
               responseData.message.length < 200 &&
               !responseData.message.toLowerCase().includes("stacktrace")
            ) {
               finalMessage = responseData.message;
            } else {
               finalMessage = getMessageFromHttpStatus(response.status);
            }
         } else {
            const errorText = await response.text();
            console.error(
               `fetchPut: API error (${response.status}):`,
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            finalMessage = getMessageFromHttpStatus(response.status);
            errorDetails = { raw: errorText.substring(0, 200) };
         }

         const errorResponse = {
            message: finalMessage,
            success: false,
            status: response.status,
            errorDetails: errorDetails,
         };
         if (
            contentType &&
            contentType.includes("application/json") &&
            typeof responseData === "object" &&
            responseData !== null
         ) {
            for (const key in responseData) {
               if (
                  key !== "message" &&
                  key !== "success" &&
                  key !== "status" &&
                  key !== "errorDetails"
               ) {
                  errorResponse[key] = responseData[key];
               }
            }
         }
         return errorResponse;
      } else {
         // response.ok
         if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
         } else {
            responseData = await response.text();
            if (response.status === 204 || responseData === "") {
               return {
                  success: true,
                  status: response.status,
                  data: null,
                  message: "Update successful (No Content)",
               };
            }
            console.warn(
               "fetchPut: Received non-JSON success response. Status:",
               response.status,
               "Content snippet:",
               responseData.substring(0, 200)
            );
            return {
               success: true,
               status: response.status,
               data: responseData,
               message: "Update successful but response was not JSON.",
            };
         }
      }

      if (typeof responseData === "object" && responseData !== null) {
         if (responseData.success === undefined) responseData.success = true;
         if (responseData.status === undefined)
            responseData.status = response.status;
      } else {
         responseData = {
            success: true,
            data: responseData,
            status: response.status,
         };
      }
      return responseData;
   } catch (error) {
      console.error("fetchPut error (outer catch):", error);
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
      };
   }
}

export async function fetchDelete(url, fetchOptions = {}) {
   const fullUrl = resolveUrl(url);
   const headers = fetchOptions.headers || {}; // Preserve other headers if passed

   // console.log(`[fetchDelete] Attempting DELETE: ${fullUrl}`);
   try {
      const response = await fetch(fullUrl, {
         ...fetchOptions, // Spread other fetch options
         method: "DELETE",
         credentials: "include",
         headers: headers,
      });
      const contentType = response.headers.get("content-type");
      let responseData;
      let finalMessage;
      let errorDetails = null;

      if (!response.ok) {
         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               `fetchDelete: Server returned an HTML error page. Status: ${response.status}. Content snippet:`,
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            finalMessage = getMessageFromHtmlError(errorHtml, response.status);
            errorDetails = {
               _isHtmlError: true,
               raw: errorHtml.substring(0, 200),
            };
         } else if (contentType && contentType.includes("application/json")) {
            responseData = await response.json();
            errorDetails = responseData;
            if (
               responseData &&
               typeof responseData.message === "string" &&
               responseData.message.length < 200 &&
               !responseData.message.toLowerCase().includes("stacktrace")
            ) {
               finalMessage = responseData.message;
            } else {
               finalMessage = getMessageFromHttpStatus(response.status);
            }
         } else {
            const errorText = await response.text();
            console.error(
               `fetchDelete: API error (${response.status}):`,
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            finalMessage = getMessageFromHttpStatus(response.status);
            errorDetails = { raw: errorText.substring(0, 200) };
         }

         const errorResponse = {
            message: finalMessage,
            success: false,
            status: response.status,
            errorDetails: errorDetails,
         };
         if (
            contentType &&
            contentType.includes("application/json") &&
            typeof responseData === "object" &&
            responseData !== null
         ) {
            for (const key in responseData) {
               if (
                  key !== "message" &&
                  key !== "success" &&
                  key !== "status" &&
                  key !== "errorDetails"
               ) {
                  errorResponse[key] = responseData[key];
               }
            }
         }
         return errorResponse;
      }

      // Handle successful responses
      if (response.status === 204) {
         // No Content
         return {
            success: true,
            message: "Resource deleted successfully.", // More specific for DELETE
            status: response.status,
            data: null,
         };
      }

      if (contentType && contentType.includes("application/json")) {
         responseData = await response.json();
         if (typeof responseData === "object" && responseData !== null) {
            if (responseData.success === undefined) responseData.success = true;
            if (responseData.status === undefined)
               responseData.status = response.status;
         } else {
            responseData = {
               success: true,
               data: responseData,
               status: response.status,
            };
         }
         return responseData;
      } else {
         // For DELETE, if it's a 2xx status but not 204 and not JSON, it's unusual.
         const text = await response.text();
         console.warn(
            "fetchDelete: API returned non-JSON, non-204 success response. Status:",
            response.status,
            "Content-Type:",
            contentType,
            "Body snippet:",
            text.substring(0, 200) + (text.length > 200 ? "..." : "")
         );
         return {
            message: `API returned an unexpected response format for DELETE. Expected JSON or No Content but received ${
               contentType || "unknown"
            } with status ${response.status}. Check console for details.`,
            success: true, // It's a 2xx success, but format is unusual
            status: response.status,
            data_received:
               text.substring(0, 200) + (text.length > 200 ? "..." : ""),
         };
      }
   } catch (error) {
      console.error("fetchDelete error (outer catch):", error);
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
      };
   }
}
