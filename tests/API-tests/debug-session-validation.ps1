# Debug Session Validation Test
# Purpose: Debug the exact issue with session validation after login for Owner Panel
# Issue: Login works but subsequent session checks fail with 401 Unauthorized

param(
    [string]$BackendUrl = "http://localhost:3001",
    [string]$FrontendUrl = "http://localhost:3000"
)

Write-Host "🔍 DEBUG SESSION VALIDATION TEST" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Backend URL: $BackendUrl" -ForegroundColor Yellow
Write-Host "Frontend URL: $FrontendUrl" -ForegroundColor Yellow
Write-Host ""

# Test credentials
$email = "owner3@mail.com"
$password = "whm3vzn9jue!zcr7CQR"

# Create a session to store cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "📋 STEP 1: Initial Session Check (should fail)" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor Magenta
try {
    $initialCheck = Invoke-RestMethod -Uri "$BackendUrl/api/auth/session" -Method GET -WebSession $session -ErrorAction Stop
    Write-Host "❌ UNEXPECTED: Initial session check succeeded" -ForegroundColor Red
    Write-Host "Response: $($initialCheck | ConvertTo-Json -Depth 3)" -ForegroundColor Yellow
} catch {
    Write-Host "✅ EXPECTED: Initial session check failed (no session yet)" -ForegroundColor Green
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "📋 STEP 2: Login Request" -ForegroundColor Magenta
Write-Host "========================" -ForegroundColor Magenta
$loginBody = @{
    email = $email
    password = $password
    return_url = "/owner"
} | ConvertTo-Json

Write-Host "Login payload: $loginBody" -ForegroundColor Yellow

try {
    $loginResponse = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -ErrorAction Stop
    Write-Host "✅ LOGIN SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($loginResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    
    # Display cookies after login
    Write-Host "🍪 Cookies after login:" -ForegroundColor Cyan
    foreach ($cookie in $session.Cookies.GetCookies($BackendUrl)) {
        Write-Host "  - $($cookie.Name): $($cookie.Value)" -ForegroundColor Yellow
        Write-Host "    Domain: $($cookie.Domain), Path: $($cookie.Path)" -ForegroundColor Gray
        Write-Host "    HttpOnly: $($cookie.HttpOnly), Secure: $($cookie.Secure)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ LOGIN FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}
Write-Host ""

Write-Host "📋 STEP 3: Immediate Session Check After Login" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta
try {
    $sessionCheck1 = Invoke-RestMethod -Uri "$BackendUrl/api/auth/session" -Method GET -WebSession $session -ErrorAction Stop
    Write-Host "✅ SESSION CHECK 1 SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($sessionCheck1 | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    Write-Host "❌ SESSION CHECK 1 FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "📋 STEP 4: Wait and Check Session Again (simulating page load)" -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "Waiting 2 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $sessionCheck2 = Invoke-RestMethod -Uri "$BackendUrl/api/auth/session" -Method GET -WebSession $session -ErrorAction Stop
    Write-Host "✅ SESSION CHECK 2 SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($sessionCheck2 | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    Write-Host "❌ SESSION CHECK 2 FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "📋 STEP 5: Test Owner Panel Specific Endpoints" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# Test owner status endpoint
try {
    $ownerStatus = Invoke-RestMethod -Uri "$BackendUrl/api/owner/status" -Method GET -WebSession $session -ErrorAction Stop
    Write-Host "✅ OWNER STATUS SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($ownerStatus | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    Write-Host "❌ OWNER STATUS FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test owner clients endpoint
try {
    $ownerClients = Invoke-RestMethod -Uri "$BackendUrl/api/owner/clients" -Method GET -WebSession $session -ErrorAction Stop
    Write-Host "✅ OWNER CLIENTS SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($ownerClients | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    Write-Host "❌ OWNER CLIENTS FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "📋 STEP 6: Test Session With Different Headers" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor Magenta

# Test with explicit headers that frontend might be sending
$headers = @{
    'Accept' = 'application/json'
    'Content-Type' = 'application/json'
    'X-Requested-With' = 'XMLHttpRequest'
}

try {
    $sessionCheck3 = Invoke-RestMethod -Uri "$BackendUrl/api/auth/session" -Method GET -Headers $headers -WebSession $session -ErrorAction Stop
    Write-Host "✅ SESSION CHECK WITH HEADERS SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($sessionCheck3 | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    Write-Host "❌ SESSION CHECK WITH HEADERS FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "📋 STEP 7: Final Cookie Analysis" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Magenta
Write-Host "🍪 Final cookies state:" -ForegroundColor Cyan
foreach ($cookie in $session.Cookies.GetCookies($BackendUrl)) {
    Write-Host "  - $($cookie.Name): $($cookie.Value)" -ForegroundColor Yellow
    Write-Host "    Domain: $($cookie.Domain), Path: $($cookie.Path)" -ForegroundColor Gray
    Write-Host "    Expires: $($cookie.Expires), HttpOnly: $($cookie.HttpOnly)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "📋 STEP 8: Logout Test" -ForegroundColor Magenta
Write-Host "======================" -ForegroundColor Magenta
try {
    $logoutResponse = Invoke-RestMethod -Uri "$BackendUrl/api/auth/logout" -Method POST -WebSession $session -ErrorAction Stop
    Write-Host "✅ LOGOUT SUCCESS" -ForegroundColor Green
    Write-Host "Response: $($logoutResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Green
} catch {
    Write-Host "❌ LOGOUT FAILED" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎯 TEST COMPLETE" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host "Check the results above to identify where the session validation is failing." -ForegroundColor Yellow 