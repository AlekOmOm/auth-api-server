# Simple Login Test - Debug Schema Context Issue
Write-Host "🔍 SIMPLE LOGIN TEST" -ForegroundColor Cyan

$email = "owner3@mail.com"
$password = "whm3vzn9jue!zcr7CQR"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Login
$loginBody = @{ email = $email; password = $password } | ConvertTo-Json

try {
    Write-Host "1. Attempting login..." -ForegroundColor Yellow
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session
    Write-Host "✅ Login Success" -ForegroundColor Green
    
    Write-Host "2. Checking session..." -ForegroundColor Yellow
    $session_check = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -WebSession $session
    Write-Host "✅ Session Success" -ForegroundColor Green
    Write-Host "Session: $($session_check | ConvertTo-Json)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
} 