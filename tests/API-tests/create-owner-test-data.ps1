# Create Owner Test Data - Task-009
# Creates client server for owner3@mail.com to make them a proper owner

$baseUrl = "http://localhost:3003"

Write-Host "Creating Owner Test Data - TASK-009" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow
Write-Host ""

# Step 1: Login as owner3@mail.com to get session
Write-Host "Step 1: Login as owner3@mail.com" -ForegroundColor Cyan

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
    Write-Host "User ID: $($loginResponse.data.id)" -ForegroundColor White
    Write-Host "Current Role: $($loginResponse.data.role)" -ForegroundColor White
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Create client server for the user
Write-Host "Step 2: Create client server for owner" -ForegroundColor Cyan

$clientData = @{
    app_name = "Owner3 Test Application"
    assigned_schema_name = "client_owner3_test_app"
    allowed_return_urls = @("http://localhost:4000", "http://localhost:5000")
    client_mode = "frontend-login-proxy"
} | ConvertTo-Json

try {
    $clientResponse = Invoke-RestMethod -Uri "$baseUrl/api/clientServer/user/register" -Method Post -Body $clientData -ContentType "application/json" -WebSession $session
    Write-Host "Client server created successfully!" -ForegroundColor Green
    Write-Host "Client ID: $($clientResponse.data.client_id)" -ForegroundColor White
    Write-Host "App Name: $($clientResponse.data.app_name)" -ForegroundColor White
    Write-Host "Schema: $($clientResponse.data.assigned_schema_name)" -ForegroundColor White
}
catch {
    Write-Host "Client server creation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Verify database has the client server
Write-Host "Step 3: Verify database state" -ForegroundColor Cyan

$dbCmd = "SELECT client_id, user_id, app_name FROM auth_internal.client_servers WHERE user_id = 'fab6cbc8-d5af-4c07-9b74-b28b04963e8a';"
$dbResult = docker exec auth-system-db-1 psql -U your_username -d your_database_name -c $dbCmd
Write-Host "Database verification:" -ForegroundColor Green
Write-Host $dbResult -ForegroundColor White

Write-Host ""

# Step 4: Test session update by calling session API
Write-Host "Step 4: Test session role update" -ForegroundColor Cyan

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/session" -Method Get -WebSession $session
    Write-Host "Session API successful!" -ForegroundColor Green
    Write-Host "Email: $($sessionResponse.data.email)" -ForegroundColor White
    Write-Host "Current Role: $($sessionResponse.data.role)" -ForegroundColor White
    
    if ($sessionResponse.data.poolMetadata) {
        Write-Host "Pool Metadata:" -ForegroundColor White
        Write-Host "   - User Role: $($sessionResponse.data.poolMetadata.user_role)" -ForegroundColor White
        Write-Host "   - Owned Clients: $($sessionResponse.data.poolMetadata.owned_clients)" -ForegroundColor White
    }
}
catch {
    Write-Host "Session API failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "TASK-009 COMPLETE!" -ForegroundColor Green
Write-Host "Owner test data has been created successfully." -ForegroundColor Green
Write-Host "owner3@mail.com should now be detected as a proper owner." -ForegroundColor Green 