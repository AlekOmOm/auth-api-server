# Client Application – Protecting Routes

## Goal
Let a **client application** (e.g. SPA or server-rendered app) verify – at runtime – whether the current browser session is authenticated **and** authorised to access a protected route, without having to understand database schemas or roles itself.

The contract is simple:
```
GET https://auth.example.com/api/auth/session  → 200 OK | 401 Unauthorized
```
If `200`, the body contains enough information for the client application to make an informed decision.

## Response Shape
```json
{
  "message": "User retrieved successfully",
  "data": {
    "id": "user_uuid",
    "name": "Alice",
    "role": "user | owner | admin",
    "schema": "client_trading_sim",
    "authorized_urls": [
      "https://trading-sim.com",
      "https://trading-sim.com/app"
    ]
  }
}
```

* `role` – high-level authorisation hint (client can hide/grey-out admin-only features)
* `authorized_urls` – subset of *authorised_urls* configured for that client; the UI can additionally check if the current `window.location.href` is allowed.

## Typical Usage in a SPA
```js
// src/stores/authStore.js (Svelte / React)
export async function ensureAuthenticated(route) {
  const res = await fetch("/api/auth/session", { credentials: "include" });
  const json = await res.json();

  if (res.status === 200 && json?.data) {
    auth.set({
      isAuthenticated: true,
      user: json.data,
    });
    return true;
  }

  // Not authenticated – redirect to Auth-System login flow
  const loginUrl = `https://auth.devalek.dev/login`;
  window.location.replace(loginUrl);
  return false;
}
```

## Server-Side Rendering (Next.js / SvelteKit)
Because sessions are **cookie-based** the same check can run in `getServerSideProps` or `+page.server.ts`.

## Edge Cases Handled by Core
1. **Expired session** – API returns `401`, client redirects to login.
2. **Cross-tenant cookie leakage** – impossible; schema detection attaches the correct schema to the session.
3. **User removed / role downgraded** – a subsequent `/session` call reflects the new state.

## Internal Implementation (FYI)
*Route handler:* `backend/src/routes/auth.js` → `getSession()` in `backend/src/services/auth.js`.

```js
export async function getSession(req, res) {
  const schema = getSchemaFromRequest(req);   // ← provided by detection middleware
  const user   = await usersRepo.getById(schema, req.session.userId);
  // …build response incl. allowed_urls based on auth_internal.client_servers …
}
```

### How Schema Detection Works with Redirects
When your client app redirects to the auth-system login page:
- The browser automatically sends a `Referer` header with the originating URL
- The auth-system matches this against your registered `identifier_url` and `authorized_urls`
- This works even from deep links like `/dashboard` or `/trade`, as long as these URLs are included in your client's `authorized_urls` configuration
- No query parameters needed - the Referer header handles tenant detection automatically

---

**TL;DR** – Client apps only need to call **one endpoint**. All heavy lifting (multi-tenant schema selection, DB lookup, role calculation) is done server-side by the Auth-System. 