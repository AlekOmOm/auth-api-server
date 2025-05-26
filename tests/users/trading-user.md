# Trading Simulator User Credentials

## 🎯 **Successfully Created During GUI Testing**

### **Primary Test User (Created via Playwright MCP)**
- **Email:** `newtrader@trading-sim.com`
- **Password:** `TradingPassword123!`
- **Name:** `Test Trader`
- **Role:** `user`
- **Schema:** `client_tradingsimulator_1748187489195`
- **Status:** ✅ Successfully registered and authenticated

### **Additional Test User (Created via Browser)**
- **Email:** `tradingtest@example.com`
- **Password:** `TradingPassword123!`
- **Name:** `Trading Test User`
- **Role:** `user`
- **Schema:** `client_tradingsimulator_1748187489195`
- **Status:** ✅ Successfully registered

---

## 📊 **Existing Trading Simulator Users (From Seed Data)**

Based on backend logs, these users exist in the Trading Simulator schema:

### **User 1:**
- **Email:** `trader@example.com`
- **ID:** `6a62826e-0073-45c9-9dd2-fdb185eef416`
- **Password:** `[Unknown - needs to be checked in database]`

### **User 2:**
- **Email:** `playwright_user_1716730000@example.com`
- **ID:** `644825a5-f6a5-4fc8-9fb3-3926a6185ef7`
- **Name:** `Playwright User`
- **Password:** `[Unknown - needs to be checked in database]`

### **User 3:**
- **Email:** `testtrader@example.com`
- **ID:** `75b9aea6-38a0-417d-a23e-9e0be47f48f8`
- **Password:** `[Unknown - needs to be checked in database]`

---

## 🧪 **Test Results**

### ✅ **What Works:**
1. **Registration Flow:** Trading Simulator → Auth-system → User created in correct schema
2. **Schema Detection:** Correctly identifies Trading Simulator client
3. **Session Creation:** Authentication session established
4. **Cross-domain Redirect:** Successfully redirects back to Trading Simulator

### ❌ **Remaining Issue:**
- Trading Simulator frontend doesn't properly check authentication status
- Shows login page even when user is authenticated
- Needs to call Auth-system `/api/auth/session` endpoint with credentials

---

## 🔧 **Usage Instructions**

### **For Manual Testing:**
1. Navigate to: `http://localhost:5173/home`
2. Click "Sign In"
3. Use credentials: `newtrader@trading-sim.com` / `TradingPassword123!`
4. Should redirect to Trading Simulator (but may show login page due to frontend issue)

### **For API Testing:**
```bash
# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{
    "credentials": {
      "email": "newtrader@trading-sim.com",
      "password": "TradingPassword123!"
    },
    "returnUrl": "http://localhost:5173/dashboard"
  }'
```

---

## 📝 **Notes**

- All users are created in schema: `client_tradingsimulator_1748187489195`
- User role is always `user` (not `owner`)
- Auth-system session validation is working perfectly
- Issue is on Trading Simulator frontend side (not Auth-system)
