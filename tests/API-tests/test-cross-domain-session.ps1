# Test Cross-Domain Session Sharing
# Purpose: Verify that sessions work correctly between Trading-sim (localhost:5173) and Auth-system (localhost:3001)

Write-Host "🔍 CROSS-DOMAIN SESSION SHARING TEST" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$email = "owner3@mail.com"
$password = "whm3vzn9jue!zcr7CQR"

# Create a session to store cookies (simulating browser behavior)
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Test 1: Login from Trading-sim perspective (with origin header)
Write-Host "1. 🎯 Testing login from Trading-sim origin..." -ForegroundColor Yellow

$loginBody = @{ 
    credentials = @{
        email = $email
        password = $password
    }
    returnUrl = "/owner"
} | ConvertTo-Json

$headers = @{
    "Origin" = "http://localhost:5173"
    "Referer" = "http://localhost:5173/"
    "Content-Type" = "application/json"
}

try {
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -Headers $headers -WebSession $session
    Write-Host "✅ Login Success from Trading-sim origin" -ForegroundColor Green
    Write-Host "User: $($login.data.name) | Role: $($login.data.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Session check from Trading-sim perspective
Write-Host ""
Write-Host "2. 🔍 Testing session check from Trading-sim origin..." -ForegroundColor Yellow

try {
    $session_check = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -Headers $headers -WebSession $session
    Write-Host "✅ Session Check Success from Trading-sim origin" -ForegroundColor Green
    Write-Host "User: $($session_check.data.name) | Role: $($session_check.data.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Session Check Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Test 3: Session check from Auth-system perspective
Write-Host ""
Write-Host "3. 🏠 Testing session check from Auth-system origin..." -ForegroundColor Yellow

$authHeaders = @{
    "Origin" = "http://localhost:3000"
    "Referer" = "http://localhost:3000/"
    "Content-Type" = "application/json"
}

try {
    $auth_session_check = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -Headers $authHeaders -WebSession $session
    Write-Host "✅ Session Check Success from Auth-system origin" -ForegroundColor Green
    Write-Host "User: $($auth_session_check.data.name) | Role: $($auth_session_check.data.role)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Session Check Failed from Auth-system origin: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Check cookies
Write-Host ""
Write-Host "4. 🍪 Session Cookie Information:" -ForegroundColor Yellow
$cookies = $session.Cookies.GetCookies("http://localhost:3001")
foreach ($cookie in $cookies) {
    Write-Host "Cookie: $($cookie.Name) = $($cookie.Value.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "Domain: $($cookie.Domain) | Path: $($cookie.Path) | Secure: $($cookie.Secure)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 Cross-domain session test completed!" -ForegroundColor Green 