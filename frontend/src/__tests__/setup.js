// Test environment setup for improved session handling

// Store session cookies globally for test session persistence
globalThis.testSessionStore = new Map();

// Enhanced fetch implementation for better cookie handling in tests
const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options = {}) => {
   // Get stored cookies for this origin
   const urlObj = new URL(url);
   const origin = urlObj.origin;
   const storedCookies = globalThis.testSessionStore.get(origin) || [];

   // Add stored cookies to request headers
   if (storedCookies.length > 0) {
      options.headers = {
         ...options.headers,
         Cookie: storedCookies.join("; "),
      };
   }

   // Make the request
   const response = await originalFetch(url, options);

   // Store new cookies from response
   const setCookieHeader = response.headers.get("set-cookie");
   if (setCookieHeader) {
      const cookies = setCookieHeader.split(/,(?=\s*[^=]+\s*=)/);
      cookies.forEach((cookie) => {
         const [cookiePart] = cookie.split(";");
         if (cookiePart && cookiePart.includes("=")) {
            const existingCookies =
               globalThis.testSessionStore.get(origin) || [];
            const [name] = cookiePart.split("=");

            // Remove existing cookie with same name
            const filteredCookies = existingCookies.filter(
               (c) => !c.startsWith(name + "=")
            );

            // Add new cookie
            filteredCookies.push(cookiePart);
            globalThis.testSessionStore.set(origin, filteredCookies);
         }
      });
   }

   return response;
};

// Clear session store before each test
beforeEach(() => {
   globalThis.testSessionStore.clear();
});

console.log("[TEST SETUP] Enhanced session persistence configured");
