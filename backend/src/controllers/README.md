# Controller Layer

## Responsibilities

The Controller layer acts as the request-response handler and serves as the entry point for HTTP requests in the application. It follows a clear separation of concerns pattern.

### Core Responsibilities:

1. **Request/Response Handling**
   - Receives Express middleware parameters: `req`, `res`, `next`
   - Manages HTTP status codes and response formatting
   - Utilizes `standardizeResponse` utility for consistent API responses

2. **Request Data Extraction**
   - Extracts data from various parts of the request:
     - `req.body` - Request payload data
     - `req.params` - URL parameters (e.g., user ID)
     - `req.session` - Session data (user ID, schema, role, metadata)
     - `req.headers` - Headers (e.g., user-agent for session tracking)
     - `req.ip` - Client IP address

3. **Service Layer Orchestration**
   - Prepares and validates required parameters for service methods
   - Calls appropriate service layer functions with extracted data
   - Does NOT interact with Model classes directly
   - Does NOT contain business logic

4. **Response Standardization**
   - Formats service layer results using `standardizeResponse` utility
   - Ensures consistent response structure:
     ```javascript
     {
       success: boolean,
       message: string,
       data?: any,
       errors?: any
     }
     ```

5. **Error Handling**
   - Catches service layer exceptions
   - Passes errors to Express global error handler via `next(error)`
   - Handles basic validation errors directly (e.g., missing required parameters)

### Architecture Benefits:

- **Separation of Concerns**: Controllers only handle HTTP-specific logic
- **Testability**: Easy to mock request/response objects
- **Consistency**: Standardized response format across all endpoints
- **Flexibility**: Service layer can be reused by different interfaces (REST, GraphQL, CLI)
- **Security**: Session data extraction is centralized through utility functions

### Example Pattern:

```javascript
const controllerMethod = async (req, res, next) => {
   try {
      // 1. Extract request data
      const data = req.body;
      const userId = sessionUtils.getUserId(req.session);
      const schema = sessionUtils.getSchema(req.session);
      
      // 2. Call service layer
      const serviceResult = await service.method({
         data,
         userId,
         schema
      });
      
      // 3. Send standardized response
      res.status(200).json(
         standardizeResponse({
            data: serviceResult.data,
            message: serviceResult.message
         })
      );
   } catch (error) {
      // 4. Pass to error handler
      next(error);
   }
};
```

This pattern ensures controllers remain thin and focused solely on HTTP concerns while delegating business logic to the service layer.