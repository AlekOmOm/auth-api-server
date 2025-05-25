import { navigate } from "svelte-routing";

/**
 * Redirect to the appropriate page after login
 *
 * - use: Login.svelte (only)
 *
 * logical flow:
 * - if return_url is in window.location.href
 *    - retrieve return_url from window.location.href
 *    - retrieve allowedUrls from authStore
 *    - validate return_url is in allowedUrls
 *    - redirect
 *       - to return_url if it is in allowedUrls
 *       - to home if it is not in allowedUrls
 * - if return_url is not in window.location.href
 *    - redirect to home
 *
 * dependencies:
 * - navigate
 *
 * context:
 * - Login.svelte uses
 * - response param
 *    - is from authStore
 *
 * response data:
 *   {
 *      success: boolean,
 *      message: string,
 *      data: {
 *         userId: string, // and other user properties
 *         role: string,
 *         poolMetadata: {
 *            client_id: string,
 *            app_name: string,
 *            return_url: string, // The specific return_url used for current login attempt
 *            allowed_return_urls: string[], // All allowed base URLs for the client
 *            user_role: string,
 *            // ... other metadata
 *         } | null
 *      },
 *      errors: ... // Optional
 *   }
 *
 */

export const loginRedirect = (response) => {
   console.log("🔄 [LOGIN REDIRECT] Starting redirect logic");
   console.log(
      "🔄 [LOGIN REDIRECT] Response received:",
      JSON.stringify(response, null, 2)
   );

   // Check for return URL in sessionStorage first, then current URL
   let returnUrl = sessionStorage.getItem("auth_return_url");
   const currentUrl = window.location.href;

   // If no stored return URL, check current URL
   if (!returnUrl && currentUrl.includes("return_url=")) {
      returnUrl = currentUrl.split("return_url=")[1]?.split("&")[0];
      if (returnUrl) {
         returnUrl = decodeURIComponent(returnUrl);
      }
   }

   console.log(
      "🔄 [LOGIN REDIRECT] Return URL from sessionStorage:",
      sessionStorage.getItem("auth_return_url")
   );
   console.log("🔄 [LOGIN REDIRECT] Current URL:", currentUrl);
   console.log("🔄 [LOGIN REDIRECT] Final return URL to use:", returnUrl);

   if (returnUrl) {
      console.log("🔄 [LOGIN REDIRECT] Return URL found, handling redirect");
      handleRedirectToReturnUrl(response, returnUrl);
   } else {
      console.log(
         "🔄 [LOGIN REDIRECT] No return URL found, redirecting to home"
      );
      navigate("/home", { replace: true });
   }
};

function handleRedirectToReturnUrl(response, returnUrl) {
   console.log("🔄 [LOGIN REDIRECT] Handling redirect to return URL");

   const { data } = response;
   console.log(
      "🔄 [LOGIN REDIRECT] Response data:",
      JSON.stringify(data, null, 2)
   );

   let allowedUrls = null;

   // Check if poolMetadata and allowed_return_urls exist from backend session
   if (data && data.poolMetadata && data.poolMetadata.allowed_return_urls) {
      allowedUrls = data.poolMetadata.allowed_return_urls;
      console.log(
         "🔄 [LOGIN REDIRECT] ✅ Found allowed URLs from poolMetadata:",
         allowedUrls
      );
   } else {
      console.log(
         "🔄 [LOGIN REDIRECT] ❌ No poolMetadata or allowed_return_urls found in response data"
      );
      console.log("🔄 [LOGIN REDIRECT] data exists:", !!data);
      console.log(
         "🔄 [LOGIN REDIRECT] poolMetadata exists:",
         !!(data && data.poolMetadata)
      );
      console.log(
         "🔄 [LOGIN REDIRECT] allowed_return_urls exists:",
         !!(data && data.poolMetadata && data.poolMetadata.allowed_return_urls)
      );

      // Fallback: If we have a return URL and it's from localhost:5173 (Trading-Sim), allow it
      if (returnUrl && returnUrl.startsWith("http://localhost:5173")) {
         console.log(
            "🔄 [LOGIN REDIRECT] ✅ Using fallback validation for Trading-Sim URL"
         );
         allowedUrls = ["http://localhost:5173/", "http://localhost:5173"];
      }
   }

   console.log("🔄 [LOGIN REDIRECT] Return URL to use:", returnUrl);

   if (allowedUrls && returnUrl) {
      const isAllowed = allowedUrls.some((allowedUrl) => {
         const matches = returnUrl.startsWith(allowedUrl);
         console.log(
            "🔄 [LOGIN REDIRECT] Checking if",
            returnUrl,
            "starts with",
            allowedUrl,
            ":",
            matches
         );
         return matches;
      });

      if (isAllowed) {
         console.log(
            "🔄 [LOGIN REDIRECT] ✅ Return URL is allowed, redirecting to:",
            returnUrl
         );
         // Clear the stored return_url after successful redirect
         sessionStorage.removeItem("auth_return_url");
         window.location.href = returnUrl; // Use direct redirect instead of navigate
         return;
      } else {
         console.log(
            "🔄 [LOGIN REDIRECT] ❌ Return URL not allowed, falling back to home"
         );
      }
   } else {
      console.log("🔄 [LOGIN REDIRECT] ❌ Missing allowedUrls or returnUrl");
      console.log("🔄 [LOGIN REDIRECT] allowedUrls:", allowedUrls);
      console.log("🔄 [LOGIN REDIRECT] returnUrl:", returnUrl);
   }

   // Fallback to home if no valid return_url or allowedUrls found
   console.log("🔄 [LOGIN REDIRECT] Falling back to home page");
   navigate("/home", { replace: true });
}
