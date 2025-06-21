# Environment Variables Documentation

## Overview

The Auth System uses environment variables for configuration to maintain security and flexibility across different deployment environments. This document lists all required and optional environment variables for both backend and frontend services.

## Backend Environment Variables

### Required Variables

#### Database Configuration

| Variable      | Type   | Description                              | Example               |
| ------------- | ------ | ---------------------------------------- | --------------------- |
| `DB_HOST`     | String | PostgreSQL database host                 | `localhost`           |
| `DB_PORT`     | Number | PostgreSQL database port                 | `5432`                |
| `DB_NAME`     | String | Database name                            | `auth_system_db`      |
| `DB_USER`     | String | Database user for auth_internal schema   | `auth_admin`          |
| `DB_PASSWORD` | String | Database password for auth_internal user | `secure_password_123` |

#### Session Configuration

| Variable          | Type   | Description                           | Example                              |
| ----------------- | ------ | ------------------------------------- | ------------------------------------ |
| `SESSION_SECRET`  | String | Express session secret (min 32 chars) | `your-super-secret-session-key-here` |
| `SESSION_NAME`    | String | Session cookie name                   | `connect.sid`                        |
| `SESSION_MAX_AGE` | Number | Session lifetime in milliseconds      | `86400000` (24 hours)                |

#### Server Configuration

| Variable   | Type   | Description         | Example                             |
| ---------- | ------ | ------------------- | ----------------------------------- |
| `PORT`     | Number | Backend server port | `3001`                              |
| `NODE_ENV` | String | Environment mode    | `development`, `production`, `test` |

### Optional Variables

#### CORS Configuration

| Variable           | Type    | Description                            | Default                 |
| ------------------ | ------- | -------------------------------------- | ----------------------- |
| `CORS_ORIGIN`      | String  | Allowed CORS origins (comma-separated) | `http://localhost:5173` |
| `CORS_CREDENTIALS` | Boolean | Allow credentials in CORS              | `true`                  |

#### Security Configuration

| Variable        | Type   | Description                       | Default          |
| --------------- | ------ | --------------------------------- | ---------------- |
| `BCRYPT_ROUNDS` | Number | Bcrypt salt rounds                | `10`             |
| `JWT_SECRET`    | String | JWT signing secret for API tokens | Random generated |
| `JWT_EXPIRY`    | String | JWT token expiration              | `7d`             |

#### Redis Configuration (if using Redis for sessions)

| Variable         | Type   | Description    | Default     |
| ---------------- | ------ | -------------- | ----------- |
| `REDIS_HOST`     | String | Redis host     | `localhost` |
| `REDIS_PORT`     | Number | Redis port     | `6379`      |
| `REDIS_PASSWORD` | String | Redis password | -           |

#### Logging Configuration

| Variable     | Type   | Description   | Default |
| ------------ | ------ | ------------- | ------- |
| `LOG_LEVEL`  | String | Logging level | `info`  |
| `LOG_FORMAT` | String | Log format    | `json`  |

### Database Pool Configuration

| Variable               | Type   | Description              | Default |
| ---------------------- | ------ | ------------------------ | ------- |
| `DB_POOL_MIN`          | Number | Minimum pool connections | `2`     |
| `DB_POOL_MAX`          | Number | Maximum pool connections | `10`    |
| `DB_POOL_IDLE_TIMEOUT` | Number | Idle timeout in ms       | `10000` |

## Frontend Environment Variables

### Build-time Variables

| Variable           | Type   | Description         | Example                     |
| ------------------ | ------ | ------------------- | --------------------------- |
| `VITE_API_URL`     | String | Backend API URL     | `http://localhost:3001/api` |
| `VITE_AUTH_URL`    | String | Auth service URL    | `http://localhost:3001`     |
| `VITE_APP_NAME`    | String | Application name    | `Auth System`               |
| `VITE_APP_VERSION` | String | Application version | `1.0.0`                     |

### Runtime Variables

| Variable | Type   | Description              | Default     |
| -------- | ------ | ------------------------ | ----------- |
| `PORT`   | Number | Frontend dev server port | `5173`      |
| `HOST`   | String | Frontend host            | `localhost` |

## Docker Environment Variables

### Docker Compose Additional Variables

| Variable            | Type   | Description                   | Example             |
| ------------------- | ------ | ----------------------------- | ------------------- |
| `POSTGRES_USER`     | String | PostgreSQL superuser          | `postgres`          |
| `POSTGRES_PASSWORD` | String | PostgreSQL superuser password | `postgres_password` |
| `POSTGRES_DB`       | String | Initial database name         | `auth_system_db`    |

## Environment File Examples

### Backend `.env` Example

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_system_db
DB_USER=auth_admin
DB_PASSWORD=your_secure_password

# Session
SESSION_SECRET=your-very-long-and-secure-session-secret-key
SESSION_NAME=connect.sid
SESSION_MAX_AGE=86400000

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
CORS_CREDENTIALS=true

# Security
BCRYPT_ROUNDS=10
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRY=7d

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty
```

### Frontend `.env` Example

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_AUTH_URL=http://localhost:3001

# App Info
VITE_APP_NAME=Auth System
VITE_APP_VERSION=1.0.0

# Development
PORT=5173
HOST=localhost
```

### Production `.env` Example

```env
# Database
DB_HOST=db.production.internal
DB_PORT=5432
DB_NAME=auth_system_db
DB_USER=auth_app_user
DB_PASSWORD=${DB_PASSWORD_FROM_SECRETS}

# Session
SESSION_SECRET=${SESSION_SECRET_FROM_SECRETS}
SESSION_NAME=__Host-auth_session
SESSION_MAX_AGE=3600000

# Server
PORT=3001
NODE_ENV=production

# CORS
CORS_ORIGIN=https://app.example.com,https://admin.example.com
CORS_CREDENTIALS=true

# Security
BCRYPT_ROUNDS=12
JWT_SECRET=${JWT_SECRET_FROM_SECRETS}
JWT_EXPIRY=1d

# Redis (for production sessions)
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD_FROM_SECRETS}

# Logging
LOG_LEVEL=warn
LOG_FORMAT=json
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use `.env.example`** files with dummy values for documentation
3. **Rotate secrets regularly** especially `SESSION_SECRET` and `JWT_SECRET`
4. **Use secret management tools** in production (AWS Secrets Manager, HashiCorp Vault, etc.)
5. **Validate environment variables** on application startup
6. **Use strong passwords** for database connections
7. **Restrict database user permissions** to minimum required

## Environment Variable Validation

The application validates required environment variables on startup:

```javascript
// Required variables check
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
```

## Troubleshooting

Common environment variable issues:

1. **Session not persisting**: Check `SESSION_SECRET` is consistent across deployments
2. **CORS errors**: Verify `CORS_ORIGIN` includes all client URLs
3. **Database connection failed**: Check database credentials and network access
4. **JWT validation errors**: Ensure `JWT_SECRET` matches between services 