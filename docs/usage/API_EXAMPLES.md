# Auth-System API Examples

This document provides practical examples of how to use the Auth-System's multi-tenant API endpoints.

## Table of Contents
1. [Client Server Registration](#client-server-registration)
2. [Client Server Authentication (Handshake)](#client-server-authentication-handshake)
3. [Using API Endpoints with Schema Detection](#using-api-endpoints-with-schema-detection)
4. [Frontend-Login-Proxy Mode](#frontend-login-proxy-mode)

---

## Client Server Registration

### 1. Register a New Client Server

**Endpoint:** `POST /api/clientServer/register`

**Request:**
```bash
curl -X POST http://localhost:3001/api/clientServer/register \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "MyApp",
    "allowed_return_urls": [
      "http://localhost:4000",
      "http://localhost:4000/auth/callback"
    ]
  }'
```

**Response:**
```json
{
  "message": "Client server registered successfully",
  "data": {
    "client_id": "client_f47ac10b58cc4372a5670e02b2c3d479",
    "client_secret": "550e8400-e29b-41d4-a716-446655440000",
    "app_name": "MyApp",
    "assigned_schema_name": "client_myapp_1703123456789",
    "allowed_return_urls": [
      "http://localhost:4000",
      "http://localhost:4000/auth/callback"
    ]
  }
}
```

**⚠️ Important:** Save the `client_secret` - it's only returned once during registration!

---

## Client Server Authentication (Handshake)

### 2. Authenticate and Get API Token

**Endpoint:** `POST /api/clientServer/handshake`

**Request:**
```bash
curl -X POST http://localhost:3001/api/clientServer/handshake \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "client_f47ac10b58cc4372a5670e02b2c3d479",
    "client_secret": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response:**
```json
{
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "schema": "client_myapp_1703123456789"
  }
}
```

---

## Using API Endpoints with Schema Detection

Once you have an API token, all requests automatically use the correct tenant schema.

### 3. Create a User in Your Schema

**Endpoint:** `POST /api/auth/register`

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "message": "Registration successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

### 4. Login a User

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "role": "user"
  }
}
```

### 5. Get All Users (Admin only)

**Endpoint:** `GET /api/users`

**Request:**
```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Frontend-Login-Proxy Mode

For clientServers that want to use Auth-System's built-in UI:

### 6. Redirect User to Auth-System

**Redirect URL:**
```
http://localhost:3001/login?return_url=http%3A//localhost%3A4000/dashboard
```

The Auth-System will:
1. **Detect the schema** from the `return_url` parameter
2. **Show the login form** with the correct tenant context
3. **Redirect back** to your app after successful login

### 7. Verify User Session

After redirect, verify the user's session:

**Endpoint:** `GET /api/auth/me`

**Request:**
```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Cookie: connect.sid=s%3Asession_cookie_value" \
  --cookie-jar cookies.txt
```

---

## Schema Detection Flow

The Auth-System automatically detects the correct database schema using:

### API Mode (Bearer Token)
```
Authorization: Bearer <token>
                     ↓
              Decode JWT token
                     ↓
            Extract schema from payload
                     ↓
          Use schema for database operations
```

### Frontend Mode (return_url)
```
?return_url=http://localhost:4000/dashboard
                     ↓
        Find client with matching allowed_return_urls
                     ↓
         Set schema in session from client record
                     ↓
          Use schema for database operations
```

### Default Mode
```
No token + No return_url match
                     ↓
         Use SEED_SCHEMA (default/admin)
                     ↓
          Use default schema for operations
```

---

## Complete Integration Example

Here's a complete example for a Node.js client application:

```javascript
// clientApp.js
const axios = require('axios');

class AuthSystemClient {
  constructor(baseUrl, clientId, clientSecret) {
    this.baseUrl = baseUrl;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
  }

  async authenticate() {
    const response = await axios.post(`${this.baseUrl}/api/clientServer/handshake`, {
      client_id: this.clientId,
      client_secret: this.clientSecret
    });
    
    this.token = response.data.data.token;
    return this.token;
  }

  async registerUser(userData) {
    return axios.post(`${this.baseUrl}/api/auth/register`, userData, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }

  async loginUser(credentials) {
    return axios.post(`${this.baseUrl}/api/auth/login`, credentials, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }

  async getUsers() {
    return axios.get(`${this.baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
  }
}

// Usage
const client = new AuthSystemClient(
  'http://localhost:3001',
  'client_f47ac10b58cc4372a5670e02b2c3d479',
  '550e8400-e29b-41d4-a716-446655440000'
);

await client.authenticate();
await client.registerUser({
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'secure123'
});
```

This implementation provides **true multi-tenancy** where each client server gets its own isolated database schema while sharing the same Auth-System infrastructure! 