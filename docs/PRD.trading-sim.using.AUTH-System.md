# Trading Simulator - Product Requirements Document

## Overview

A **real-time trading simulator** application that allows users to practice trading with live market data using virtual currency. The application leverages our **Auth-System** for authentication and authorization, providing secure multi-tenant user management while focusing on the core trading experience.

---

## 🎯 Core Features

### Trading Functionality
- **Real-time candlestick charts** with live market data
- **Virtual portfolio management** with paper trading
- **Order placement** (buy/sell orders with virtual currency)
- **Portfolio tracking** (P&L, positions, trading history)
- **Market data visualization** (charts, indicators, volume)

### User Management (via Auth-System)
- **Secure user registration** with strong password requirements
- **Session-based authentication** with seamless login flow
- **User profile management** 
- **Trading history persistence** per user
- **Multi-tenant isolation** (each user's data is completely separate)

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Trading-Sim   │    │   Auth-System   │    │  Data Server    │    │   PostgreSQL    │
│   Frontend      │    │                 │    │                 │    │                 │
│   (Svelte)      │───▶│ Frontend-Proxy  │    │ Socket.IO       │    │ auth_internal   │
│                 │    │ Login Mode      │    │ wss://candle-   │    │ trading_sim     │
├─────────────────┤    │                 │    │ data.devalek    │    │ - users         │
│   Trading-Sim   │───▶│ Session Mgmt    │───▶│ .dev            │───▶│ - portfolios    │
│   Backend       │    │ User Auth       │    │                 │    │ - trades        │
│   (Express)     │    │                 │    │                 │    │ - positions     │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🔧 Tech Stack

### Frontend (Svelte)
```javascript
// Core Libraries
- Svelte 4+ (reactive framework)
- Svelte Routing (client-side routing)
- Svelte Stores (state management)

// Trading-Specific
- Chart.js / D3.js (candlestick charts)
- Socket.IO Client (real-time data)
- Tailwind CSS (styling)

// Auth Integration
- Fetch API (session validation)
- Cookie handling (session persistence)
```

### Backend (Express Node.js)
```javascript
// Core Libraries
- Express.js (web framework)
- Socket.IO (real-time communication)
- Session management (express-session)

// Database
- PostgreSQL (user data, trades, portfolios)
- pg (PostgreSQL client)

// Auth Integration
- Session validation middleware
- Proxy requests to Auth-System
```

---

## 🔐 Auth-System Integration (Frontend-Proxy-Login Mode)

### Integration Strategy

The Trading Simulator will use **Frontend-Proxy-Login** mode, where unauthenticated users are redirected to the Auth-System's login UI, receive a session cookie, and are seamlessly redirected back.

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant TradingSim as Trading-Sim App
    participant AuthSys as Auth-System
    participant DataServer as Data Server

    User->>TradingSim: Visit /dashboard
    TradingSim->>TradingSim: Check session validity
    TradingSim-->>User: HTTP 302 to Auth-System
    Note over User,AuthSys: Auth-System handles login/register
    User->>AuthSys: GET /login?return_url=trading-sim/dashboard
    AuthSys-->>User: Render login form
    User->>AuthSys: POST /login (credentials)
    AuthSys->>AuthSys: Validate & create session
    AuthSys-->>User: Set session cookie; HTTP 302 back
    User->>TradingSim: Request /dashboard with session
    TradingSim->>AuthSys: GET /api/auth/session (validate)
    AuthSys-->>TradingSim: { user: {...}, userId: "uuid" }
    TradingSim->>DataServer: Connect socket with userId
    TradingSim-->>User: Render trading dashboard
```

### Implementation Details

#### 1. **Session Validation Middleware**
```javascript
// middleware/auth.js
async function requireAuth(req, res, next) {
  try {
    // Check session with Auth-System
    const response = await fetch('http://localhost:3003/api/auth/session', {
      headers: {
        'Cookie': req.headers.cookie || ''
      }
    });

    if (!response.ok) {
      // Redirect to Auth-System login
      const returnUrl = encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
      return res.redirect(`http://localhost:3000/login?return_url=${returnUrl}`);
    }

    const sessionData = await response.json();
    req.user = sessionData.user;
    req.userId = sessionData.userId;
    next();
  } catch (error) {
    console.error('Auth validation failed:', error);
    return res.status(500).json({ error: 'Authentication service unavailable' });
  }
}
```

#### 2. **Frontend Session Store**
```javascript
// stores/authStore.js
import { writable } from 'svelte/store';

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    isAuthenticated: false,
    loading: true
  });

  return {
    subscribe,
    
    async checkSession() {
      try {
        const response = await fetch('/api/auth/validate', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          set({ user: userData, isAuthenticated: true, loading: false });
        } else {
          set({ user: null, isAuthenticated: false, loading: false });
        }
      } catch (error) {
        set({ user: null, isAuthenticated: false, loading: false });
      }
    },

    logout() {
      // Redirect to Auth-System logout
      window.location.href = 'http://localhost:3000/logout';
    }
  };
}

export const authStore = createAuthStore();
```

#### 3. **Route Protection**
```javascript
// components/ProtectedRoute.svelte
<script>
  import { authStore } from '../stores/authStore.js';
  import { onMount } from 'svelte';
  
  export let component;
  
  let loading = true;
  let isAuthenticated = false;
  
  onMount(async () => {
    await authStore.checkSession();
  });
  
  authStore.subscribe(state => {
    loading = state.loading;
    isAuthenticated = state.isAuthenticated;
  });
</script>

{#if loading}
  <div class="loading">Checking authentication...</div>
{:else if isAuthenticated}
  <svelte:component this={component} />
{:else}
  <div class="redirect">Redirecting to login...</div>
  <script>
    window.location.href = '/auth/login';
  </script>
{/if}
```

---

## 📊 Database Schema (Trading-Specific)

The Auth-System provides user management, while Trading-Sim adds trading-specific tables:

```sql
-- Created in the client's schema (e.g., trading_sim_schema)

-- User portfolios (extends Auth-System users)
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  balance DECIMAL(15,2) DEFAULT 100000.00, -- Starting virtual money
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trading positions
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  symbol VARCHAR(10) NOT NULL,
  quantity DECIMAL(15,8) NOT NULL,
  avg_price DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trade history
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  symbol VARCHAR(10) NOT NULL,
  side VARCHAR(4) NOT NULL, -- 'BUY' or 'SELL'
  quantity DECIMAL(15,8) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  total DECIMAL(15,2) NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 Real-Time Data Integration

### Socket.IO Connection with Authentication
```javascript
// services/dataService.js
import io from 'socket.io-client';
import { authStore } from '../stores/authStore.js';

class DataService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  async connect() {
    // Get authenticated user info
    const authState = get(authStore);
    if (!authState.isAuthenticated) {
      throw new Error('User not authenticated');
    }

    this.socket = io('wss://candle-data.devalek.dev', {
      auth: {
        userId: authState.user.userId,
        // Could also send session token if data server requires it
      }
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      console.log('Connected to data server');
    });

    this.socket.on('candle', (data) => {
      // Update chart data
      this.handleCandleData(data);
    });
  }

  subscribeToSymbol(symbol) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe', { symbol });
    }
  }

  handleCandleData(data) {
    // Update Svelte stores with new candle data
    candleStore.update(data);
  }
}

export const dataService = new DataService();
```

---

## 🚀 Development Setup

### 1. **Auth-System Configuration**
```bash
# Ensure Auth-System is running
docker compose up -d

# Register Trading-Sim as a client
curl -X POST http://localhost:3003/api/clientServer/register \
  -H "Content-Type: application/json" \
  -d '{
    "app_name": "Trading Simulator",
    "allowed_return_urls": [
      "http://localhost:4000",
      "http://localhost:4000/dashboard",
      "http://localhost:4000/portfolio"
    ]
  }'
```

### 2. **Trading-Sim Environment**
```bash
# .env
AUTH_SYSTEM_URL=http://localhost:3000
AUTH_API_URL=http://localhost:3003/api
DATA_SERVER_URL=wss://candle-data.devalek.dev
TRADING_SIM_PORT=4000

# Database (uses same PostgreSQL as Auth-System)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=auth_system
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
TRADING_SCHEMA=trading_sim_schema
```

### 3. **Application Structure**
```
trading-simulator/
├── frontend/                 # Svelte app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chart.svelte
│   │   │   ├── Portfolio.svelte
│   │   │   └── ProtectedRoute.svelte
│   │   ├── stores/
│   │   │   ├── authStore.js
│   │   │   ├── candleStore.js
│   │   │   └── portfolioStore.js
│   │   ├── services/
│   │   │   ├── dataService.js
│   │   │   └── tradingApi.js
│   │   └── routes/
│   │       ├── Dashboard.svelte
│   │       └── Portfolio.svelte
├── backend/                  # Express API
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   ├── trades.js
│   │   │   └── portfolio.js
│   │   ├── services/
│   │   │   └── tradingService.js
│   │   └── db/
│   │       └── schema.sql
└── docker-compose.yml
```

---

## 🎯 Key Benefits of This Integration

### 1. **Separation of Concerns**
- **Auth-System**: Handles all authentication, user management, security
- **Trading-Sim**: Focuses purely on trading logic and market data
- **Data-Server**: Provides real-time market data

### 2. **Multi-Tenant Ready**
- Each user gets isolated data (via Auth-System's schema detection)
- Easy to scale to multiple trading environments
- Clean user data separation

### 3. **Secure by Design**
- Session-based authentication with HTTP-only cookies
- No JWT handling in frontend (more secure)
- Auth-System handles all security concerns

### 4. **Simple Frontend Code**
- No complex auth logic in trading components
- Clean redirect flow
- Svelte stores handle auth state reactively

---

## 🧪 Testing Strategy

### 1. **Auth Integration Tests**
```javascript
// Test auth redirection
test('unauthenticated user redirected to auth-system', async () => {
  const response = await fetch('http://localhost:4000/dashboard');
  expect(response.status).toBe(302);
  expect(response.headers.get('location')).toContain('localhost:3000/login');
});

// Test authenticated access
test('authenticated user can access dashboard', async () => {
  // Login through Auth-System first
  const loginResponse = await authLogin('admin@admin.com', 'admin');
  const cookies = loginResponse.headers.get('set-cookie');
  
  const response = await fetch('http://localhost:4000/dashboard', {
    headers: { Cookie: cookies }
  });
  expect(response.status).toBe(200);
});
```

### 2. **Trading Logic Tests**
```javascript
// Test virtual trading
test('user can place buy order', async () => {
  const tradeData = {
    symbol: 'AAPL',
    side: 'BUY',
    quantity: 10,
    price: 150.00
  };
  
  const response = await fetch('/api/trades', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': authenticatedCookies
    },
    body: JSON.stringify(tradeData)
  });
  
  expect(response.status).toBe(201);
  const trade = await response.json();
  expect(trade.symbol).toBe('AAPL');
});
```

---

## 🚀 Deployment Considerations

### 1. **Environment Setup**
- **Auth-System**: Already deployed and operational
- **Trading-Sim**: Deploy alongside, configured to use Auth-System
- **Domain Configuration**: Same-site cookies for seamless auth

### 2. **Production Configuration**
```yaml
# docker-compose.prod.yml
services:
  trading-sim-frontend:
    build: ./frontend
    environment:
      - AUTH_SYSTEM_URL=https://auth.yourdomain.com
      - API_URL=https://trading-api.yourdomain.com
      
  trading-sim-backend:
    build: ./backend
    environment:
      - AUTH_SYSTEM_API=https://auth.yourdomain.com/api
      - DATABASE_URL=postgresql://user:pass@db:5432/auth_system
      - TRADING_SCHEMA=trading_sim_production
```

---

## 🎉 Success Metrics

### User Experience
- **✅ Seamless login flow** - users don't notice auth system boundary
- **✅ Fast authentication** - session validation under 100ms
- **✅ Real-time data** - candlestick updates under 500ms latency
- **✅ Responsive UI** - trading actions complete under 200ms

### Technical Performance
- **✅ Auth-System integration** - 99.9% uptime dependency
- **✅ Database isolation** - complete user data separation
- **✅ Session security** - secure, HTTP-only cookie implementation
- **✅ Real-time reliability** - WebSocket connection stability

This architecture provides a **production-ready trading simulator** that leverages the robust, multi-tenant Auth-System while maintaining clean separation of concerns and optimal user experience. 🚀

