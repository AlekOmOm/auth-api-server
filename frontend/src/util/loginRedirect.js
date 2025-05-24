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
   const currentUrl = window.location.href;
   /**
    * two cases:
    * - client frontend has redirect
    * - client frontend does not have redirect
    */

   if (currentUrl.includes("return_url=")) {
      handleRedirectToReturnUrl(response);
   } else {
      navigate("/home", { replace: true });
   }
};

function handleRedirectToReturnUrl(response) {
   const { data } = response;
   let allowedUrls = null;

   // Check if poolMetadata and allowed_return_urls exist from backend session
   if (data && data.poolMetadata && data.poolMetadata.allowed_return_urls) {
      allowedUrls = data.poolMetadata.allowed_return_urls;
   }

   const returnUrlFromQuery = window.location.href
      .split("return_url=")[1]
      ?.split("&")[0];

   if (allowedUrls && returnUrlFromQuery) {
      const decodedReturnUrl = decodeURIComponent(returnUrlFromQuery);
      if (
         allowedUrls.some((allowedUrl) =>
            decodedReturnUrl.startsWith(allowedUrl)
         )
      ) {
         navigate(decodedReturnUrl, { replace: true });
         return;
      }
   }
   // Fallback to home if no valid return_url or allowedUrls found
   navigate("/home", { replace: true });
}
