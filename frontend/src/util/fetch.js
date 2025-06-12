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
   if (
      import.meta.env.VITEST &&
      typeof url === "string" &&
      url.startsWith("/")
   ) {
      const resolved = `${VITE_BACKEND_URL_BASE}${url}`;
      // console.log("[resolveUrl] Condition met. Resolved URL:", resolved);
      return resolved;
   }
   // console.log(
   //    "[resolveUrl] Condition NOT met or not in Vitest. Returning original URL:",
   //    url
   // );
   return url;
}

export async function fetchGet(url) {
   const fullUrl = resolveUrl(url);
   // console.log(`[fetchGet] Attempting GET: ${fullUrl}`);
   try {
      const response = await fetch(fullUrl, {
         credentials: "include",
      });
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
         let errorData;
         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               `fetchGet: Server returned an HTML error page. Status: ${response.status}. Content snippet:`,
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            return {
               message: `API error (${response.status}): The server returned an unexpected HTML error. Please check the console for details.`,
               success: false,
               status: response.status,
               _isHtmlError: true,
            };
         } else if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
            return {
               ...errorData,
               success: false,
               status: response.status,
            };
         } else {
            const errorText = await response.text();
            console.error(
               `fetchGet: API error (${response.status}):`,
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            return {
               message: `API error (${response.status}): ${
                  errorText.substring(0, 200) +
                  (errorText.length > 200 ? "..." : "")
               }`,
               success: false,
               status: response.status,
            };
         }
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

export async function fetchPost(url, body) {
   const fullUrl = resolveUrl(url);
   // console.log("🔍 [FETCH] fetchPost called");
   // console.log("🔍 [FETCH] Original URL for POST:", url);
   // console.log("🔍 [FETCH] Resolved URL for POST:", fullUrl);
   // console.log("🔍 [FETCH] Request body:", body);

   try {
      // console.log("🔍 [FETCH] Making fetch request to:", fullUrl);
      const response = await fetch(fullUrl, {
         method: "POST",
         credentials: "include",
         headers: {
            "Content-Type": "application/json",
         },
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
      let responseData;

      if (!response.ok && contentType && contentType.includes("text/html")) {
         const errorHtml = await response.text();
         console.error(
            "fetchPost: Server returned an HTML error page. Status:",
            response.status,
            "Content snippet:",
            errorHtml.substring(0, 1000) +
               (errorHtml.length > 1000 ? "..." : "")
         );
         responseData = {
            message: `The server returned an unexpected HTML error (${response.status}). Please check the console for more details.`,
            _isHtmlError: true, // Internal flag
         };
      } else if (contentType && contentType.includes("application/json")) {
         responseData = await response.json();
      } else {
         const text = await response.text();
         const truncatedText =
            text.substring(0, 500) + (text.length > 500 ? "..." : "");
         responseData = { message: truncatedText }; // Wrap text, even for success, if not JSON
         if (!response.ok) {
            console.warn(
               "fetchPost: Received non-JSON, non-HTML error. Status:",
               response.status,
               "Content snippet:",
               truncatedText
            );
         } else {
            console.warn(
               "fetchPost: Received non-JSON success response. Status:",
               response.status,
               "Content snippet:",
               truncatedText
            );
         }
      }

      if (!response.ok) {
         if (typeof responseData === "object" && responseData !== null) {
            if (responseData._isHtmlError) {
               return {
                  message: responseData.message,
                  success: false,
                  status: response.status,
               };
            }
            // For JSON errors from backend, return the whole thing, ensuring success: false
            return {
               ...responseData, // Spread the original JSON error
               success: false, // Ensure success is false
               status: response.status, // Add status
            };
         } else if (typeof responseData === "string") {
            return {
               message: responseData,
               success: false,
               status: response.status,
            };
         } else {
            // Fallback
            return {
               message:
                  "An unknown error occurred processing the error response.",
               success: false,
               status: response.status,
            };
         }
      }

      // Handle successful responses
      // console.log("🔍 [FETCH] Response ok, handling success");
      if (typeof responseData === "object" && responseData !== null) {
         if (responseData.success === undefined) {
            responseData.success = true;
         }
      } else {
         // if responseData is not an object (e.g. just a string after a successful POST which is unusual but possible)
         // wrap it to ensure a consistent return type.
         responseData = { success: true, data: responseData };
      }

      // console.log("🔍 [FETCH] Returning success response:", responseData);
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

export async function fetchPut(url, body) {
   const fullUrl = resolveUrl(url);
   // console.log(`[fetchPut] Attempting PUT: ${fullUrl}`);
   try {
      const response = await fetch(fullUrl, {
         method: "PUT",
         credentials: "include",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify(body),
      });
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
         let errorData;
         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               `fetchPut: Server returned an HTML error page. Status: ${response.status}. Content snippet:`,
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            return {
               message: `API error (${response.status}): The server returned an unexpected HTML error. Please check the console for details.`,
               success: false,
               status: response.status,
               _isHtmlError: true,
            };
         } else if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
            return {
               ...errorData,
               success: false,
               status: response.status,
            };
         } else {
            const errorText = await response.text();
            console.error(
               `fetchPut: API error (${response.status}):`,
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            return {
               message: `API error (${response.status}): ${
                  errorText.substring(0, 200) +
                  (errorText.length > 200 ? "..." : "")
               }`,
               success: false,
               status: response.status,
            };
         }
      }

      // Handle successful responses
      if (contentType && contentType.includes("application/json")) {
         const responseData = await response.json();
         if (typeof responseData === "object" && responseData !== null) {
            if (responseData.success === undefined) {
               responseData.success = true;
            }
         } else {
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
            "fetchPut: API returned non-JSON success response. Content-Type:",
            contentType,
            "Body snippet:",
            text.substring(0, 200) + (text.length > 200 ? "..." : "")
         );
         return {
            message: `API returned an unexpected response format. Expected JSON but received ${
               contentType || "unknown"
            }. Check console for details.`,
            success: false, // Treat as failure if not JSON
            status: response.status,
            data_received:
               text.substring(0, 200) + (text.length > 200 ? "..." : ""),
         };
      }
   } catch (error) {
      console.error("fetchPut error (outer catch):", error);
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
      };
   }
}

export async function fetchDelete(url) {
   const fullUrl = resolveUrl(url);
   // console.log(`[fetchDelete] Attempting DELETE: ${fullUrl}`);
   try {
      const response = await fetch(fullUrl, {
         method: "DELETE",
         credentials: "include",
      });
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
         let errorData;
         if (contentType && contentType.includes("text/html")) {
            const errorHtml = await response.text();
            console.error(
               `fetchDelete: Server returned an HTML error page. Status: ${response.status}. Content snippet:`,
               errorHtml.substring(0, 1000) +
                  (errorHtml.length > 1000 ? "..." : "")
            );
            return {
               message: `API error (${response.status}): The server returned an unexpected HTML error. Please check the console for details.`,
               success: false,
               status: response.status,
               _isHtmlError: true,
            };
         } else if (contentType && contentType.includes("application/json")) {
            errorData = await response.json();
            return {
               ...errorData,
               success: false,
               status: response.status,
            };
         } else {
            const errorText = await response.text();
            console.error(
               `fetchDelete: API error (${response.status}):`,
               errorText.substring(0, 500) +
                  (errorText.length > 500 ? "..." : "")
            );
            return {
               message: `API error (${response.status}): ${
                  errorText.substring(0, 200) +
                  (errorText.length > 200 ? "..." : "")
               }`,
               success: false,
               status: response.status,
            };
         }
      }

      // Handle successful responses
      if (response.status === 204) {
         // No Content
         return {
            success: true,
            message: "Resource deleted successfully.",
            status: response.status,
         };
      }

      if (contentType && contentType.includes("application/json")) {
         const responseData = await response.json();
         if (typeof responseData === "object" && responseData !== null) {
            if (responseData.success === undefined) {
               responseData.success = true;
            }
         } else {
            return {
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
            success: false, // Treat as failure if not JSON and not 204
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
