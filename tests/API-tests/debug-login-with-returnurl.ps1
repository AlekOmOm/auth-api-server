# Debug Login with Return URL Test
Write-Host "🔍 DEBUG LOGIN WITH RETURN_URL TEST" -ForegroundColor Cyan

$email = "owner3@mail.com"
$password = "whm3vzn9jue!zcr7CQR"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Login with proper credentials structure that the backend expects
$loginBody = @{ 
    credentials = @{
        email = $email
        password = $password
    }
    returnUrl = "/owner"
} | ConvertTo-Json

Write-Host "Login payload:" -ForegroundColor Yellow
Write-Host $loginBody -ForegroundColor Gray

try {
    Write-Host "1. Attempting login with return_url..." -ForegroundColor Yellow
    $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session
    Write-Host "✅ Login Success" -ForegroundColor Green
    Write-Host "Login response: $($login | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    
    Write-Host "`n2. Checking session immediately after login..." -ForegroundColor Yellow
    $session_check = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -WebSession $session
    Write-Host "✅ Session Success" -ForegroundColor Green
    Write-Host "Session response: $($session_check | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    
    Write-Host "`n3. Testing Owner Panel endpoint..." -ForegroundColor Yellow
    $owner_status = Invoke-RestMethod -Uri "http://localhost:3001/api/owner/status" -Method GET -WebSession $session
    Write-Host "✅ Owner Status Success" -ForegroundColor Green
    Write-Host "Owner status: $($owner_status | ConvertTo-Json -Depth 3)" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    
    # Try to get response body for debugging
    if ($_.Exception.Response) {
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response body: $responseBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Could not read response body" -ForegroundColor Gray
        }
    }
} 