# Debug Trading-sim Registration Issue
Write-Host "🔍 DEBUG TRADING-SIM REGISTRATION" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Test the registration that's failing from Trading-sim
$email = "trade@mail.com"
$password = "password123"

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Test 1: Registration with Trading-sim origin
Write-Host "1. 🎯 Testing registration from Trading-sim origin..." -ForegroundColor Yellow

$registerBody = @{ 
    credentials = @{
        email = $email
        password = $password
        name = "trade"
    }
} | ConvertTo-Json

try {
    $headers = @{
        "Origin" = "http://localhost:5173"
        "Referer" = "http://localhost:5173/"
    }
    
    Write-Host "Registration payload:" -ForegroundColor Gray
    Write-Host $registerBody -ForegroundColor Gray
    
    $register = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -WebSession $session -Headers $headers
    Write-Host "✅ Registration Success:" -ForegroundColor Green
    Write-Host ($register | ConvertTo-Json -Depth 3) -ForegroundColor Green
    
} catch {
    Write-Host "❌ Registration Failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "2. 🎯 Testing with existing owner credentials instead..." -ForegroundColor Yellow

# Test 2: Login with existing owner credentials
$ownerEmail = "owner3@mail.com"
$ownerPassword = "whm3vzn9jue!zcr7CQR"

$loginBody = @{ 
    credentials = @{
        email = $ownerEmail
        password = $ownerPassword
    }
    returnUrl = "http://localhost:5173/"
} | ConvertTo-Json

try {
    $headers = @{
        "Origin" = "http://localhost:5173"
        "Referer" = "http://localhost:5173/"
    }
    
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -Headers $headers
    Write-Host "✅ Owner Login Success:" -ForegroundColor Green
    Write-Host ($login | ConvertTo-Json -Depth 3) -ForegroundColor Green
    
    # Test session check
    Write-Host "3. 🎯 Testing session check..." -ForegroundColor Yellow
    $sessionCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -WebSession $session -Headers $headers
    Write-Host "✅ Session Check Success:" -ForegroundColor Green
    Write-Host ($sessionCheck | ConvertTo-Json -Depth 3) -ForegroundColor Green
    
} catch {
    Write-Host "❌ Owner Login Failed:" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 RECOMMENDATION:" -ForegroundColor Cyan
Write-Host "Use existing owner credentials in Trading-sim:" -ForegroundColor Yellow
Write-Host "Email: owner3@mail.com" -ForegroundColor Green
Write-Host "Password: whm3vzn9jue!zcr7CQR" -ForegroundColor Green 