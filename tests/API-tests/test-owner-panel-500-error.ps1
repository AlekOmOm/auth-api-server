# Test script to debug Owner Panel 500 error
# This script tests the complete flow: login -> session check -> client servers API

Write-Host "🔍 TESTING OWNER PANEL 500 ERROR" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

$baseUrl = "http://localhost:3001"
$session = @{}

Write-Host "`n📊 Step 1: Login with owner credentials and /owner return URL" -ForegroundColor Cyan

$loginData = @{
    credentials = @{
        email = "owner3@mail.com"
        password = "whm3vzn9jue!zcr7CQR"
    }
    returnUrl = "/owner"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -SessionVariable session
    Write-Host "✅ Login Response:" -ForegroundColor Green
    Write-Host ($loginResponse | ConvertTo-Json -Depth 5)
    
    if ($loginResponse.data.role -eq "owner") {
        Write-Host "✅ User correctly logged in as OWNER" -ForegroundColor Green
    } else {
        Write-Host "❌ User role is: $($loginResponse.data.role) (expected: owner)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📊 Step 2: Check session status" -ForegroundColor Cyan

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/session" -Method GET -WebSession $session
    Write-Host "✅ Session Response:" -ForegroundColor Green
    Write-Host ($sessionResponse | ConvertTo-Json -Depth 5)
    
    if ($sessionResponse.data.role -eq "owner") {
        Write-Host "✅ Session correctly shows OWNER role" -ForegroundColor Green
    } else {
        Write-Host "❌ Session role is: $($sessionResponse.data.role) (expected: owner)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Session check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "❌ Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📊 Step 3: Test client servers API" -ForegroundColor Cyan

try {
    $clientsResponse = Invoke-RestMethod -Uri "$baseUrl/api/clientServer/user/clients" -Method GET -WebSession $session
    Write-Host "✅ Client Servers Response:" -ForegroundColor Green
    Write-Host ($clientsResponse | ConvertTo-Json -Depth 5)
    Write-Host "✅ Client servers API is working!" -ForegroundColor Green
} catch {
    Write-Host "❌ Client servers API failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "❌ Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Additional debugging
    if ($_.Exception.Response.StatusCode -eq 500) {
        Write-Host "🔍 500 Internal Server Error detected - this is the issue we are investigating" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "🔍 401 Unauthorized - session or authentication issue" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Step 4: Test owner-specific API" -ForegroundColor Cyan

try {
    $ownerResponse = Invoke-RestMethod -Uri "$baseUrl/api/owner/dashboard" -Method GET -WebSession $session
    Write-Host "✅ Owner Dashboard Response:" -ForegroundColor Green
    Write-Host ($ownerResponse | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "❌ Owner dashboard API failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "❌ Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

Write-Host "`nTest Complete!" -ForegroundColor Yellow 