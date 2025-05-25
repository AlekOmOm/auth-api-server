# Technical Implementation

## req and res from frontend to backend

```javascript
// frontend/src/services/authApi.js

// --- frontend --- 
{
  credentials: { email, password },
  returnUrl: "https://client.com/dashboard"
}

// --- backend --- 

// 1. schemaDetection middleware
{
  poolContext: "client_tenant",
  schema: "client_schema_name", 
  poolMetadata: { client_id, user_role: "user", ... }
}

// 2. authController.js
{
  user: { id, name, email, role },
  session: { id, userId, expiresAt }
}



```


## core component: detectSchema

The schema detection happens in the `detectSchemaFromReturnUrl` middleware:

```javascript
// backend/src/middleware/schemaDetection.js
export const detectSchemaFromReturnUrl = async (req, res, next) => {
   try {
      const { return_url } = req.body;

      if (return_url) {
         // Get all client servers from database
         const { rows: clientServers } = await authInternalPool.query(
            "SELECT * FROM client_servers"
         );

         // Find client with matching allowed_return_urls
         const matchingClient = clientServers.find((client) =>
            client.allowed_return_urls.some((allowedUrl) =>
               return_url.startsWith(allowedUrl)
            )
         );

         if (matchingClient) {
            /**
             * req:
             *  {
             *    body: {
             *      return_url: 'http://localhost:4000/dashboard'
             *    },
             *    session: {
             *      schema: 'auth_internal',
             *      client_id: '123'
             *    }
             * }
             */
            req.session.schema = matchingClient.assigned_schema_name;
            req.session.client_id = matchingClient.client_id;
            req.schema = matchingClient.assigned_schema_name;
            
            console.log(`Schema detected: ${matchingClient.assigned_schema_name}`);
         }
      }

      next();
   } catch (error) {
      console.error("Error detecting schema:", error);
      next(); // Continue with default behavior
   }
};
```

## frontend implementation for login proxy mode
- receive users in login/register page [login](../frontend/src/routes/card/Login.svelte) [register](../frontend/src/routes/card/Register.svelte)
- decode return_url from params
- send request to backend api with return_url to get schema
    - [authStore.js](../frontend/src/stores/authStore.js)
    - [authApi.js](../frontend/src/services/authApi.js)
- backend receives api/login api/register request with return_url in req.body
    - [auth.js](../backend/src/routes/auth.js)

- backend decode return_url to get schema (detechSchema middleware on all routes) [schemaDetection.js](../backend/src/middleware/schemaDetection.js)
  - flow:
    - if no return_url, set schema to default schema (auth_internal)
    - if return_url, set schema to the schema of the client
  - persistence: 
    - req and session:
        - set schema in session
        - set req.schema
    - session persistence:
        - backend sets session data  
        - frontend can access session data from backend 
           - by /api/auth/session

- backend authentication:
    - [authController.js](../backend/src/controllers/auth.js)
    - [authService.js](../backend/src/services/auth.js)
    - [userRepository.js](../backend/src/repo/userRepository.js)
  - login/register logic with credentials in the correct schema
  - return user to frontend
- frontend receives user
  - [authApi.js](../frontend/src/services/authApi.js)
  - [authStore.js](../frontend/src/stores/authStore.js)

## backend implementation for login proxy mode
- receive return_url in api/login api/register request
- decode return_url to get schema
