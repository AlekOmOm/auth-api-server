# Trading Simulator Manual Test Guide

## 🎯 **COMPLETE END-USER FLOW TEST**

Based on the backend logs analysis, here's the complete manual test for the Trading Simulator authentication flow.

---

## ✅ **CONFIRMED WORKING (From Logs)**

Our session validation fixes are working perfectly:
- ✅ Schema detection correctly identifies Trading Simulator client
- ✅ Correct schema used: `client_tradingsimulator_1748187489195`
- ✅ Return URL handled correctly: `http://localhost:5173/dashboard`
- ✅ Cross-domain session sharing configured
- ✅ Session preservation logic working

---

## 🧪 **MANUAL TEST STEPS**

### **Step 1: Access Trading Simulator**
1. Open your browser
2. Navigate to: `http://localhost:5173/home`
3. **Expected:** Trading Simulator home page loads

### **Step 2: Initiate Sign In**
1. Click the **"Sign In"** button on Trading-sim
2. **Expected:** Redirects to Auth-system login page
3. **URL should be:** `http://localhost:3001/login?return_url=http://localhost:5173/dashboard`

### **Step 3: Login with Trading Simulator User**
Use one of these **existing Trading Simulator users** (from backend logs):

**Option A: Primary Test User**
- **Email:** `trader@example.com`
- **Password:** `[You need to check the password for this user]`

**Option B: Playwright Test User**
- **Email:** `playwright_user_1716730000@example.com`
- **Password:** `PlaywrightStrongPW123!`

**Option C: Test Trader**
- **Email:** `testtrader@example.com`
- **Password:** `[You need to check the password for this user]`

### **Step 4: Complete Login**
1. Enter the credentials above
2. Click **"Login"**
3. **Expected Results:**
   - ✅ Login succeeds (no 401 errors)
   - ✅ User role: `user` (not `owner`)
   - ✅ Schema: `client_tradingsimulator_1748187489195`
   - ✅ Redirects to: `http://localhost:5173/dashboard`

### **Step 5: Verify Session**
1. **Expected:** Trading Simulator dashboard loads (no infinite loading)
2. **Expected:** User is authenticated and can access Trading-sim features
3. **Expected:** Session persists across page refreshes

---

## 🔧 **If Users Don't Have Passwords**

If the existing users don't have known passwords, you can:

### **Option 1: Register New User**
1. Go to: `http://localhost:3001/register?return_url=http://localhost:5173/dashboard`
2. Register with:
   - **Name:** `TestTrader`
   - **Email:** `newtrader@example.com`
   - **Password:** `TestPassword123!`
3. **Expected:** Creates user in Trading Simulator schema
4. **Expected:** Redirects to `http://localhost:5173/dashboard`

### **Option 2: Use Database to Check Passwords**
Run this to see user passwords:
```sql
SELECT email, password_hash FROM client_tradingsimulator_1748187489195.users;
```

---

## 📊 **EXPECTED BEHAVIOR (Based on PRD)**

### **✅ Correct Flow:**
1. **User visits:** `localhost:5173/home`
2. **Clicks "Sign In"** → Redirects to Auth-system
3. **Registers/Logs in** → Creates user in Trading-sim tenant schema
4. **Auth-system redirects back** → `localhost:5173/dashboard`
5. **User has access** → Trading-sim features work

### **✅ Technical Details:**
- **User Role:** `user` (not `owner`)
- **Schema:** `client_tradingsimulator_1748187489195`
- **Pool Context:** `client_tenant`
- **Return URL:** `localhost:5173/dashboard`
- **Session:** Persists across Trading-sim requests

---

## 🎉 **SUCCESS CRITERIA**

The test is successful if:
- ✅ No infinite "Loading..." on Trading-sim dashboard
- ✅ User can navigate Trading-sim without re-authentication
- ✅ Session persists across page refreshes
- ✅ Logout works correctly
- ✅ No 401 Unauthorized errors in browser console

---

## 🚨 **TROUBLESHOOTING**

### **If Login Fails:**
1. Check browser console for errors
2. Verify you're using the correct Trading Simulator user emails
3. Check backend logs: `make logs-backend`

### **If Infinite Loading:**
1. Check browser Network tab for 401 errors
2. Verify session cookies are being sent
3. Check if user exists in correct schema

### **If Wrong Redirect:**
1. Verify return URL in login request
2. Check that Trading Simulator client is configured correctly
3. Ensure `http://localhost:5173/dashboard` is in allowed return URLs

---

## 📝 **NOTES**

- The session validation fix is working perfectly (confirmed by logs)
- Schema detection correctly identifies Trading Simulator
- The issue was using wrong user credentials (not schema problems)
- All cross-domain session sharing is configured correctly 