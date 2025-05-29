# `/api/auth/session` Endpoint

## What it Does
Returns the **current authentication & authorisation context** of the caller.  It is the single source of truth consumed by:

* Auth-System's own front-end (owner/admin dashboards)
* Every onboarded client application (to protect routes)
* Automated tests & monitoring

## Route Definition
```
Method:  GET
URL:     /api/auth/session
Auth:    Cookie-based session  (Express-session)
Returns: 200  – JSON user details
         401  – Not authenticated / session expired
```

## Handler Stack
```
app.get("/api/auth/session",
  detectSchema,        // multi-tenant awareness
  requireAuthSession,  // throw 401 if no valid session
  authController.me    // assemble response
)
```

* `detectSchema` – attaches the correct tenant schema (see docs/components/schema-detection.md)
* `requireAuthSession` – lightweight middleware checking `req.session.userId`
* `authController.me` – the logic below

## Implementation Snapshot
```js
// backend/src/controllers/auth.js
export async function me(req, res) {
  const schema = getSchemaFromRequest(req);          // tenant
  const user   = await usersRepo.getById(schema, req.session.userId);
  const client = await clientServersRepo.getBySchema(schema);

  res.json({
    message: "User retrieved successfully",
    data: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      schema,
      authorized_urls: client.authorized_urls,
    },
  });
}
```
*(file/variable names may differ slightly but the concept is identical)*

## Why include `authorized_urls`?
The Auth-System delegates *page-level* authorisation to the client application:

1. The client already knows which route is being accessed.
2. Comparing `currentUrl` against `authorized_urls` is cheap and avoids another back-and-forth to the server.
3. The server can still perform **endpoint-level** checks if required.

## Error Responses
| Status | When                        | Example JSON |
|--------|-----------------------------|--------------|
| 401    | No session / expired        | `{ "error": "NOT_AUTHENTICATED" }` |
| 403    | Session exists but revoked  | `{ "error": "SESSION_REVOKED" }` |

## Integration Example (Node / Axios)
```js
axios.get("https://auth.example.com/api/auth/session", {
  withCredentials: true,
}).then(({data}) => {
  // data.data.role === 'owner' ? …
});
```

## Testing Cheat-Sheet
```bash
# Unauthenticated
curl -i https://auth.example.com/api/auth/session  # 401

# Authenticated (cookie jar)
curl -i -b cookies.txt -c cookies.txt https://auth.example.com/api/auth/session
```

---
**Bottom line** – This endpoint encapsulates *both* authentication ("Who are you?") *and* high-level authorisation info ("Where are you allowed to go?") in one inexpensive call. 