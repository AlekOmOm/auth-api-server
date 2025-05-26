# Complete Trading Simulator End-User Flow Test
# Purpose: Test the complete flow from Trading-sim registration to login and redirect back to dashboard
# Based on PRD: End User flow for client applications

Write-Host "🎯 COMPLETE TRADING SIMULATOR END-USER FLOW TEST" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Generate unique test user credentials
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$testEmail = "trader_$timestamp@trading-sim.com"
$testPassword = "TradingPassword123!"
$testName = "Trader_$timestamp"

Write-Host "🧪 Test User Credentials:" -ForegroundColor Yellow
Write-Host "Email: $testEmail" -ForegroundColor Green
Write-Host "Password: $testPassword" -ForegroundColor Green
Write-Host "Name: $testName" -ForegroundColor Green
Write-Host ""

# Create a session to store cookies (simulating browser behavior)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Headers to simulate Trading-sim origin
$tradingSimHeaders = @{
    "Origin" = "http://localhost:5173"
    "Referer" = "http://localhost:5173/home"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

Write-Host "📋 STEP 1: Simulate Trading-sim redirect to Auth-system for registration" -ForegroundColor Yellow
Write-Host "Expected: User clicks 'Sign In' on Trading-sim, gets redirected to Auth-system" -ForegroundColor Gray
Write-Host ""

# Step 1: Registration (End User registering for Trading Simulator)
Write-Host "📝 STEP 2: Register new Trading Simulator user" -ForegroundColor Yellow

$registerBody = @{ 
    credentials = @{
        email = $testEmail
        password = $testPassword
        name = $testName
    }
    returnUrl = "http://localhost:5173/dashboard"  # Trading-sim dashboard
} | ConvertTo-Json

try {
    Write-Host "Registration payload:" -ForegroundColor Gray
    Write-Host $registerBody -ForegroundColor Gray
    Write-Host ""
    
    $register = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -WebSession $session -Headers $tradingSimHeaders
    Write-Host "✅ Registration Success:" -ForegroundColor Green
    Write-Host ($register | ConvertTo-Json -Depth 3) -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Registration Failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    
    # Continue with login test even if registration fails (user might already exist)
}

# Step 2: Login (End User logging into Trading Simulator)
Write-Host "🔐 STEP 3: Login with Trading Simulator user" -ForegroundColor Yellow

$loginBody = @{ 
    credentials = @{
        email = $testEmail
        password = $testPassword
    }
    returnUrl = "http://localhost:5173/dashboard"  # Should redirect to Trading-sim dashboard
} | ConvertTo-Json

try {
    Write-Host "Login payload:" -ForegroundColor Gray
    Write-Host $loginBody -ForegroundColor Gray
    Write-Host ""
    
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -Headers $tradingSimHeaders
    Write-Host "✅ Login Success:" -ForegroundColor Green
    Write-Host ($login | ConvertTo-Json -Depth 3) -ForegroundColor Green
    Write-Host ""
    
    # Verify user role and schema
    $userData = $login.data
    Write-Host "🔍 User Analysis:" -ForegroundColor Cyan
    Write-Host "Role: $($userData.role)" -ForegroundColor $(if ($userData.role -eq "user") { "Green" } else { "Red" })
    Write-Host "Schema Context: Expected 'client_trading_sim'" -ForegroundColor Gray
    
    if ($userData.poolMetadata) {
        Write-Host "Pool Metadata:" -ForegroundColor Gray
        Write-Host ($userData.poolMetadata | ConvertTo-Json -Depth 2) -ForegroundColor Gray
    }
    Write-Host ""
    
} catch {
    Write-Host "❌ Login Failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    return
}

# Step 3: Session Check (Verify session works for Trading Simulator)
Write-Host "🔍 STEP 4: Verify session works for Trading Simulator" -ForegroundColor Yellow

try {
    $sessionCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -WebSession $session -Headers $tradingSimHeaders
    Write-Host "✅ Session Check Success:" -ForegroundColor Green
    Write-Host ($sessionCheck | ConvertTo-Json -Depth 3) -ForegroundColor Green
    Write-Host ""
    
    # Verify session data
    $sessionData = $sessionCheck.data
    Write-Host "🔍 Session Analysis:" -ForegroundColor Cyan
    Write-Host "User ID: $($sessionData.id)" -ForegroundColor Green
    Write-Host "Role: $($sessionData.role)" -ForegroundColor $(if ($sessionData.role -eq "user") { "Green" } else { "Red" })
    Write-Host "Email: $($sessionData.email)" -ForegroundColor Green
    
    if ($sessionData.poolMetadata) {
        Write-Host "Pool Metadata:" -ForegroundColor Gray
        Write-Host ($sessionData.poolMetadata | ConvertTo-Json -Depth 2) -ForegroundColor Gray
    }
    Write-Host ""
    
} catch {
    Write-Host "❌ Session Check Failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Step 4: Test logout
Write-Host "🚪 STEP 5: Test logout from Trading Simulator" -ForegroundColor Yellow

try {
    $logout = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/logout" -Method POST -WebSession $session -Headers $tradingSimHeaders
    Write-Host "✅ Logout Success:" -ForegroundColor Green
    Write-Host ($logout | ConvertTo-Json -Depth 2) -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Logout Failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Summary
Write-Host "📊 FLOW SUMMARY:" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host "✅ Expected Flow (Based on PRD):" -ForegroundColor Green
Write-Host "1. User visits Trading-sim (localhost:5173/home)" -ForegroundColor Gray
Write-Host "2. User clicks 'Sign In' → Redirects to Auth-system" -ForegroundColor Gray
Write-Host "3. User registers/logs in → Creates user in Trading-sim tenant schema" -ForegroundColor Gray
Write-Host "4. Auth-system redirects back → localhost:5173/dashboard" -ForegroundColor Gray
Write-Host "5. User has access to Trading-sim features" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Key Points:" -ForegroundColor Yellow
Write-Host "- User should have role: 'user' (not 'owner')" -ForegroundColor Gray
Write-Host "- User should be in 'client_trading_sim' schema" -ForegroundColor Gray
Write-Host "- Return URL should be 'localhost:5173/dashboard'" -ForegroundColor Gray
Write-Host "- Session should work across Trading-sim requests" -ForegroundColor Gray 