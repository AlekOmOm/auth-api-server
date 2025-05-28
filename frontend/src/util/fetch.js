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
   console.log("🔍 [FETCH] fetchPost called");
   console.log("🔍 [FETCH] URL:", url);
   console.log("🔍 [FETCH] Request body:", body);

   try {
      console.log("🔍 [FETCH] Making fetch request...");
      const response = await fetch(url, {
         method: "POST",
         credentials: "include",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify(body),
      });

      console.log("🔍 [FETCH] Fetch response received");
      console.log("🔍 [FETCH] Response status:", response.status);
      console.log("🔍 [FETCH] Response ok:", response.ok);
      console.log(
         "🔍 [FETCH] Response headers:",
         Object.fromEntries(response.headers.entries())
      );

      // Parse response regardless of status
      const contentType = response.headers.get("content-type");
      console.log("🔍 [FETCH] Content type:", contentType);
      let responseData;

      if (contentType && contentType.includes("application/json")) {
         console.log("🔍 [FETCH] Parsing as JSON...");
         responseData = await response.json();
         console.log("🔍 [FETCH] Parsed JSON data:", responseData);
      } else {
         console.log("🔍 [FETCH] Parsing as text...");
         const text = await response.text();
         console.log("🔍 [FETCH] Parsed text:", text);
         responseData = { message: text };
      }

      // Handle non-ok responses
      if (!response.ok) {
         console.log("🔍 [FETCH] Response not ok, handling error");
         if (typeof responseData === "object" && responseData !== null) {
            responseData.success = false;
         } else {
            responseData = { success: false, message: responseData };
         }
         console.log("🔍 [FETCH] Returning error response:", responseData);
         return responseData;
      }

      // Handle successful responses
      console.log("🔍 [FETCH] Response ok, handling success");
      if (typeof responseData === "object" && responseData !== null) {
         if (responseData.success === undefined) {
            responseData.success = true;
         }
      } else {
         responseData = { success: true, data: responseData };
      }

      console.log("🔍 [FETCH] Returning success response:", responseData);
      return responseData;
   } catch (error) {
      console.error("🔍 [FETCH] fetchPost error:", error);
      console.error("🔍 [FETCH] Error type:", error.constructor.name);
      console.error("🔍 [FETCH] Error message:", error.message);
      // For network errors or JSON parsing errors, return a standard error object
      return {
         success: false,
         message: error.message || "Network error or failed to parse response.",
      };
   }
}
