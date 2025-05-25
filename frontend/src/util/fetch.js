export async function fetchGet(url) {
   try {
      const response = await fetch(url, {
         credentials: "include",
      });

      if (!response.ok) {
         const errorText = await response.text();
         throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
         return await response.json();
      } else {
         const text = await response.text();
         throw new Error(
            `API returned non-JSON response: ${text.substring(0, 50)}...`
         );
      }
   } catch (error) {
      console.error("fetchGet error:", error);
      throw error; // Re-throw so it can be handled by the caller
   }
}

export async function fetchPost(url, body) {
   try {
      const response = await fetch(url, {
         method: "POST",
         credentials: "include",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify(body),
      });

      let responseData = await parseResponse(response);

      // Check response.ok *after* parsing
      if (!response.ok) {
         if (
            typeof responseData === "object" &&
            responseData !== null &&
            responseData.success === undefined
         ) {
            responseData.success = false;
         }
         // If it's not an object (rare case), wrap it
         else if (typeof responseData !== "object" || responseData === null) {
            responseData = { success: false, data: responseData };
         }
         return responseData; // Return the error details
      }

      // If response is ok and was JSON, ensure success: true is set if not present
      const contentType = response.headers.get("content-type");
      if (
         response.ok &&
         contentType &&
         contentType.includes("application/json")
      ) {
         if (
            typeof responseData === "object" &&
            responseData !== null &&
            responseData.success === undefined
         ) {
            responseData.success = true;
         }
         // If it's not an object (e.g., just a success message string from API), wrap it
         else if (typeof responseData !== "object" || responseData === null) {
            responseData = { success: true, data: responseData };
         }
      }

      return responseData; // Return successful data
   } catch (error) {
      console.error("fetchPost error:", error);
      // For network errors or JSON parsing errors, return a standard error object
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
      };
   }
}

/**
 *
 * @param {*} response
 * @returns
 *
 * - if JSON, return JSON
 * - if not JSON, return text
 * - if error, throw error
 */
async function parseResponse(response) {
   const contentType = response.headers.get("content-type");

   if (!response.ok) {
      throw new Error("API error: " + response.status);
   }

   // if JSON
   if (contentType && contentType.includes("application/json")) {
      return await response.json();
   }

   // else convert
   const json = JSON.parse(await response.text());

   return { success: true, data: json, isJson: true };
}
