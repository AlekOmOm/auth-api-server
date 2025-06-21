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

export async function loginRedirect(response, returnUrlFromSession) {
   console.log("🔄 [LOGIN REDIRECT UTIL] Starting redirect logic");
   const responseData = response?.data;
   console.log(
      "🔄 [LOGIN REDIRECT UTIL] Response data (User object):",
      responseData
   );
   console.log(
      "🔄 [LOGIN REDIRECT UTIL] returnUrlFromSession:",
      returnUrlFromSession
   );

   let finalReturnUrl = null;

   // Priority 1: returnUrlFromSession (captured from original URL query param or client interaction)
   if (returnUrlFromSession) {
      finalReturnUrl = returnUrlFromSession;
      console.log(
         `🔄 [LOGIN REDIRECT UTIL] Using returnUrlFromSession: ${finalReturnUrl}`
      );
   }
   // Priority 2: Fallback based on user role if no specific session URL
   else {
      // Access role directly from responseData (User object)
      if (responseData?.role === "owner") {
         finalReturnUrl = "/owner";
         console.log(
            `🔄 [LOGIN REDIRECT UTIL] Fallback for owner: ${finalReturnUrl}`
         );
      } else {
         finalReturnUrl = "/home"; // Default fallback for users or if role is unclear
         console.log(
            `🔄 [LOGIN REDIRECT UTIL] Fallback for user/default: ${finalReturnUrl}`
         );
      }
   }

   console.log(
      "🔄 [LOGIN REDIRECT UTIL] Final determined return URL to use:",
      finalReturnUrl
   );

   // Clean up the stored return_url from session storage after it has been used or determined.
   sessionStorage.removeItem("auth_return_url");
   console.log(
      "🔄 [LOGIN REDIRECT UTIL] Cleared auth_return_url from sessionStorage."
   );

   if (finalReturnUrl) {
      if (finalReturnUrl.startsWith("http")) {
         console.log(
            `🔄 [LOGIN REDIRECT UTIL] External URL detected, redirecting browser to: ${finalReturnUrl}`
         );
         window.location.href = finalReturnUrl; // Full page redirect for external URLs
      } else {
         console.log(
            `🔄 [LOGIN REDIRECT UTIL] Internal path detected, Svelte navigating to: ${finalReturnUrl}`
         );
         navigate(finalReturnUrl, { replace: true });

         // Add fallback navigation if Svelte navigate doesn't work
         setTimeout(() => {
            if (window.location.pathname !== finalReturnUrl) {
               console.log(
                  `🔄 [LOGIN REDIRECT UTIL] Svelte navigate didn't work, using window.location`
               );
               window.location.href = finalReturnUrl;
            }
         }, 100);
      }
   } else {
      // This case should ideally not be reached if fallbacks are set correctly.
      console.error(
         "🔄 [LOGIN REDIRECT UTIL] No valid return URL determined. Defaulting to /home."
      );
      navigate("/home", { replace: true });
   }
}
