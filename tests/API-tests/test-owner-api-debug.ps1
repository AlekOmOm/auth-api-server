Write-Host "🚀 Starting Debug Script" -ForegroundColor Green
$baseUrl = "http://localhost:3003/api"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "`n📝 Register User"
$registerBody = @{ name = "Owner Debug User"; email = "ownerdebug@example.com"; password = "OwnerPassword123!" } | ConvertTo-Json
try {
    Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -WebSession $session -ErrorAction Stop | Out-Null
    Write-Host "✅ Register OK"
} catch {
    Write-Host "❌ Register FAIL: $($_.Exception.Message)"
    if ($_.Exception.Response) { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host "Details: $($reader.ReadToEnd())" }
    exit 1
}

Write-Host "`n🔐 Login User"
$loginBody = @{ credentials = @{ email = "ownerdebug@example.com"; password = "OwnerPassword123!" } } | ConvertTo-Json
try {
    Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -ErrorAction Stop | Out-Null
    Write-Host "✅ Login OK"
} catch {
    Write-Host "❌ Login FAIL: $($_.Exception.Message)"
    if ($_.Exception.Response) { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host "Details: $($reader.ReadToEnd())" }
    exit 1
}

Write-Host "`n🏢 Create Client Server"
$clientServerBody = @{ appName = "Debug App"; schemaName = "debug_app_schema"; clientMode = "frontend-login-proxy"; allowedReturnUrls = @("http://localhost:9999") } | ConvertTo-Json
$clientId = $null
try {
    $clientResponse = Invoke-WebRequest -Uri "$baseUrl/clientServer/user/register" -Method POST -Body $clientServerBody -ContentType "application/json" -WebSession $session -ErrorAction Stop
    Write-Host "✅ Client Create OK"
    $clientData = $clientResponse.Content | ConvertFrom-Json
    $clientId = $clientData.data.client_id
    Write-Host "📋 Client ID: $clientId"
} catch {
    Write-Host "❌ Client Create FAIL: $($_.Exception.Message)"
    if ($_.Exception.Response) { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host "Details: $($reader.ReadToEnd())" }
    exit 1
}

Write-Host "`n📊 Test Owner Stats (after client creation)"
try {
    $statsResponse = Invoke-WebRequest -Uri "$baseUrl/owner/stats" -Method GET -WebSession $session -ErrorAction Stop
    Write-Host "✅ Owner Stats OK"
    Write-Host "Response: $($statsResponse.Content)" 
} catch {
    Write-Host "❌ Owner Stats FAIL: $($_.Exception.Message)"
    if ($_.Exception.Response) { $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); Write-Host "Details: $($reader.ReadToEnd())" }
    exit 1
}

Write-Host "`n🎉 Debug Script Completed!" -ForegroundColor Green
exit 0 