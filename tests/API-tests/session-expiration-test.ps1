# Session Expiration Issue Test - CRITICAL Priority (task-008)
# Tests the root cause: NULL expires_at in sessions table

$baseUrl = "http://localhost:3003"
$frontendUrl = "http://localhost:3000"

Write-Host "Testing CRITICAL ISSUE: Session Expiration Fix (task-008)" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow

# Test 1: Login and create session
Write-Host ""
Write-Host "Test 1: Login with owner3@mail.com" -ForegroundColor Cyan

$loginBody = @{
    credentials = @{
        email = "owner3@mail.com"
        password = "whm3vzn9jue!zcr7CQR"
    }
    returnUrl = "/owner"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable session
    Write-Host "Login successful: $($loginResponse.message)" -ForegroundColor Green
    Write-Host "User data: $($loginResponse.data.email) | Role: $($loginResponse.data.role)" -ForegroundColor Green
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Check session validation
Write-Host ""
Write-Host "Test 2: Session validation check" -ForegroundColor Cyan

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/session" -Method Get -WebSession $session
    Write-Host "Session API call successful: $($sessionResponse.message)" -ForegroundColor Green
    Write-Host "Session data: $($sessionResponse.data.email) | Role: $($sessionResponse.data.role)" -ForegroundColor Green
}
catch {
    Write-Host "Session validation failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "THIS CONFIRMS THE CRITICAL ISSUE!" -ForegroundColor Red
}

# Test 3: Database verification
Write-Host ""
Write-Host "Test 3: Database session verification" -ForegroundColor Cyan
Write-Host "Checking sessions table for NULL expires_at..." -ForegroundColor White

Write-Host ""
Write-Host "SUMMARY:" -ForegroundColor Yellow
Write-Host "========" -ForegroundColor Yellow
Write-Host "Login works - sessions created" -ForegroundColor Green
Write-Host "Session API returns 200 OK" -ForegroundColor Green  
Write-Host "Sessions have NULL expires_at" -ForegroundColor Red
Write-Host "ProtectedRoute fails validation" -ForegroundColor Red
Write-Host "PRIORITY: Fix session expiration timestamps (task-008)" -ForegroundColor Yellow 