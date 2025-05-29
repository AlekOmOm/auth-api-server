/**
 * Utility for handling URL storage and retrieval
 * 
 * used by Backend to detect schema
 * 
 * 
 */

/**
 * Extract and store return URL from current window location
 * @returns {string|null} The stored return URL or null if none found
 */
export function extractAndStoreReturnUrl() {
   console.log(
      "🔍 [RETURN URL HANDLER] Extracting return URL from:",
      window.location.href
   );

   let storedReturnUrl = null;

   if (window.location.search.includes("return_url")) {
      storedReturnUrl = new URL(window.location.href).searchParams.get(
         "return_url"
      );
      if (storedReturnUrl) {
         sessionStorage.setItem("auth_return_url", storedReturnUrl);
         console.log(
            "🔍 [RETURN URL HANDLER] Stored return_url in sessionStorage:",
            storedReturnUrl
         );
      }
   } else {
      // Check if we have a stored return_url from a previous page load
      storedReturnUrl = sessionStorage.getItem("auth_return_url");
      if (storedReturnUrl) {
         console.log(
            "🔍 [RETURN URL HANDLER] Retrieved return_url from sessionStorage:",
            storedReturnUrl
         );
      }
   }

   return storedReturnUrl;
}

/**
 * Get the current stored return URL
 * @returns {string|null} The stored return URL or null if none found
 */
export function getStoredReturnUrl() {
   return sessionStorage.getItem("auth_return_url");
}

/**
 * Build a URL with return URL parameter preserved
 * @param {string} basePath - The base path (e.g., '/login', '/register')
 * @returns {string} The URL with return_url parameter if one exists
 */
export function buildUrlWithReturnUrl(basePath) {
   const returnUrl = getStoredReturnUrl();
   return returnUrl
      ? `${basePath}?return_url=${encodeURIComponent(returnUrl)}`
      : basePath;
}
