# Deployment Guide

## Overview

This guide covers deployment options for the Auth System, including local development, Docker deployment, and production deployment strategies.

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Docker and Docker Compose (for containerized deployment)
- Git

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/auth-system.git
cd auth-system
```

### 2. Database Setup

```bash
# Create database
createdb auth_system_db

# Create required schemas
psql -d auth_system_db -c "CREATE SCHEMA auth_internal;"
psql -d auth_system_db -c "CREATE SCHEMA client_template;"

# Run database migrations (if available)
# npm run db:migrate
```

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, SESSION_SECRET

# Start development server
npm run dev
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Required: VITE_API_URL, VITE_AUTH_URL

# Start development server
npm run dev
```

## Docker Deployment

### Using Docker Compose

#### 1. Create docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password
      POSTGRES_DB: auth_system_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - auth_network

  backend:
    build: ./backend
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: auth_system_db
      DB_USER: auth_admin
      DB_PASSWORD: auth_password
      SESSION_SECRET: your-session-secret-here
      NODE_ENV: production
      PORT: 3001
    depends_on:
      - postgres
    ports:
      - "3001:3001"
    networks:
      - auth_network

  frontend:
    build: ./frontend
    environment:
      VITE_API_URL: http://backend:3001/api
      VITE_AUTH_URL: http://backend:3001
    depends_on:
      - backend
    ports:
      - "80:80"
    networks:
      - auth_network

volumes:
  postgres_data:

networks:
  auth_network:
```

#### 2. Create Database Initialization Script

Create `init-db.sql`:

```sql
-- Create auth_admin user
CREATE USER auth_admin WITH PASSWORD 'auth_password';

-- Create schemas
CREATE SCHEMA auth_internal;
CREATE SCHEMA client_template;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA auth_internal TO auth_admin;
GRANT ALL PRIVILEGES ON SCHEMA client_template TO auth_admin;
GRANT ALL PRIVILEGES ON DATABASE auth_system_db TO auth_admin;
```

#### 3. Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

### Cloud Platform Deployment

#### AWS Deployment

##### 1. RDS PostgreSQL Setup

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier auth-system-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username postgres \
  --master-user-password <secure-password> \
  --allocated-storage 20
```

##### 2. ECS/Fargate Deployment

```bash
# Build and push Docker images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ecr-uri>

docker build -t auth-backend ./backend
docker tag auth-backend:latest <ecr-uri>/auth-backend:latest
docker push <ecr-uri>/auth-backend:latest

docker build -t auth-frontend ./frontend
docker tag auth-frontend:latest <ecr-uri>/auth-frontend:latest
docker push <ecr-uri>/auth-frontend:latest
```

##### 3. Create ECS Task Definition

```json
{
  "family": "auth-system",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<ecr-uri>/auth-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3001"}
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-host"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-password"
        },
        {
          "name": "SESSION_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:session-secret"
        }
      ]
    }
  ]
}
```

#### Kubernetes Deployment

##### 1. Create Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: auth-system
```

##### 2. Create ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-config
  namespace: auth-system
data:
  DB_HOST: "postgres-service"
  DB_PORT: "5432"
  DB_NAME: "auth_system_db"
  NODE_ENV: "production"
```

##### 3. Create Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: auth-secrets
  namespace: auth-system
type: Opaque
data:
  DB_PASSWORD: <base64-encoded-password>
  SESSION_SECRET: <base64-encoded-secret>
  JWT_SECRET: <base64-encoded-jwt-secret>
```

##### 4. Deploy Backend

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-backend
  namespace: auth-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-backend
  template:
    metadata:
      labels:
        app: auth-backend
    spec:
      containers:
      - name: backend
        image: your-registry/auth-backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: auth-config
        - secretRef:
            name: auth-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-backend-service
  namespace: auth-system
spec:
  selector:
    app: auth-backend
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### Reverse Proxy Configuration

#### Nginx Configuration

```nginx
upstream auth_backend {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

server {
    listen 80;
    server_name auth.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name auth.example.com;
    
    ssl_certificate /etc/ssl/certs/auth.example.com.crt;
    ssl_certificate_key /etc/ssl/private/auth.example.com.key;
    
    # Security headers
    add_header X-Frame-Options "DENY";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend
    location / {
        root /var/www/auth-frontend;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://auth_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Health Checks and Monitoring

### Health Check Endpoints

Implement these endpoints in your backend:

```javascript
// GET /health - Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// GET /ready - Readiness check (includes DB connection)
app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### Monitoring Setup

1. **Application Metrics**: Use Prometheus + Grafana
2. **Logs**: Centralize with ELK stack or CloudWatch
3. **Uptime Monitoring**: Use services like UptimeRobot or Pingdom
4. **Error Tracking**: Integrate Sentry or Rollbar

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Set secure headers (CSP, HSTS, etc.)
- [ ] Enable rate limiting
- [ ] Implement DDoS protection (CloudFlare, AWS Shield)
- [ ] Regular security audits
- [ ] Automated vulnerability scanning
- [ ] Secure secrets management
- [ ] Database encryption at rest
- [ ] Regular backups with tested restore procedures

## Scaling Considerations

1. **Horizontal Scaling**: Add more backend instances behind load balancer
2. **Database Scaling**: Use read replicas for read-heavy operations
3. **Session Storage**: Move to Redis for distributed sessions
4. **CDN**: Serve static assets through CDN
5. **Caching**: Implement Redis caching layer for frequent queries

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="auth_system_db"

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Compress backup
gzip "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz" s3://your-backup-bucket/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

### Restore Procedure

```bash
# Download backup from S3
aws s3 cp s3://your-backup-bucket/db_backup_20240115_120000.sql.gz .

# Decompress
gunzip db_backup_20240115_120000.sql.gz

# Restore
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < db_backup_20240115_120000.sql
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check network connectivity
   - Verify credentials
   - Check firewall rules

2. **Session Issues**
   - Verify SESSION_SECRET consistency
   - Check cookie settings
   - Ensure proper CORS configuration

3. **Performance Issues**
   - Monitor database query performance
   - Check connection pool settings
   - Review application logs

4. **Deployment Failures**
   - Check container logs
   - Verify environment variables
   - Test health check endpoints

### Database Initialization Problems (e.g., Missing Tables)

If the application reports that essential database tables (like `auth_internal.client_servers` or `auth_internal.users`) are missing, it often means the database initialization scripts did not run correctly. This typically occurs when using Docker if a PostgreSQL data volume already existed from a previous run, causing the new initialization scripts to be skipped.

To resolve this:

1.  **Stop the Database Container:**
    If you are using Docker Compose (as per the `make` commands in this project), you can stop all services:
    ```bash
    make down
    # or
    docker-compose down
    ```
    If you are running the database container standalone, stop it directly:
    ```bash
    docker stop <your-db-container-name> # e.g., auth-system-db-1
    ```

2.  **Identify and Remove the Docker Volume:**
    The PostgreSQL Docker image uses a volume to persist data. If this volume is not empty, initialization scripts in `/docker-entrypoint-initdb.d/` will not run.
    *   **Identify the volume:** If using `make` files or `docker-compose.yml` from this project, the volume is typically named `auth-system_postgres_data`. You can list all volumes to confirm:
        ```bash
        docker volume ls
        ```
    *   **Remove the volume:**
        ```bash
        docker volume rm auth-system_postgres_data
        ```
        (Replace `auth-system_postgres_data` if your volume has a different name).
        **Caution**: This command deletes the data in the volume. Only do this if you are sure you want to re-initialize the database from scratch.

3.  **Restart Services / Database Container:**
    This will recreate the container and, because the volume is now gone (or will be recreated as new and empty), PostgreSQL will run any scripts found in `/docker-entrypoint-initdb.d/`.
    ```bash
    make run
    # or
    docker-compose up -d
    ```

4.  **Verify Initialization in Logs:**
    Check the logs of the newly started database container:
    ```bash
    make logs-db
    # or
    docker logs <your-db-container-name> # e.g., auth-system-db-1
    ```
    Look for lines indicating that your SQL initialization scripts (e.g., `auth_internal_complete.sql`) were executed. For example:
    `LOG: executing /docker-entrypoint-initdb.d/auth_internal_complete.sql`
    Also, check for any errors during this script execution.

If these steps are followed, the database schema should be correctly initialized. 