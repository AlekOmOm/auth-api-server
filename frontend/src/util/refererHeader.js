/**
 * Utility for extracting the referer header from the Client App redirection 
 * 
 * @usage 
 *  - by Login and Register .svelte components
 * 
 * @flow 
 * - Browser sends Referer header automatically:
 *   ```
 *   GET https://auth.example.com/login
 *   Referer: https://trading-sim.com/dashboard
 *   ```
 * - Auth-system detects tenant:
 *   ```
 *   Checks if Referer matches any client's identifier_url or authorized_urls
 *   Sets the correct database schema (client_trading_sim)
 *   ```
 *   1) 
 * - User logs in with credentials
 * 
 * @docs (docs/core-components/referer-based-auth-flow.md) 
 */

/**
 * Extract referer header from the Client App redirection
 * @returns {string} referer header
 */
export function extractRefererHeader() {
  const referer = document.referrer;
  return referer;
}
