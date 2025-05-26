# Owner Panel API Testing Script
# This script tests the complete owner panel functionality

Write-Host "🚀 Starting Owner Panel API Tests" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Base URL
$baseUrl = "http://localhost:3003/api"

# Test 1: Create a session variable for cookie management
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "`n📝 Test 1: Register a new user with owner privileges" -ForegroundColor Yellow

# First, let's register a new user (this will be a regular user initially)
$registerBody = @{
    name = "Owner Test User"
    email = "ownertest@example.com"
    password = "OwnerPassword123!"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -WebSession $session
    Write-Host "✅ User registration successful" -ForegroundColor Green
    Write-Host "Response: $($registerResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ User registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

Write-Host "`n🔐 Test 2: Login with the new user" -ForegroundColor Yellow

$loginBody = @{
    credentials = @{
        email = "ownertest@example.com"
        password = "OwnerPassword123!"
    }
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session
    Write-Host "✅ Login successful" -ForegroundColor Green
    Write-Host "Response: $($loginResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

Write-Host "`n📊 Test 3: Try to access owner stats (should fail - user role)" -ForegroundColor Yellow

try {
    $statsResponse = Invoke-WebRequest -Uri "$baseUrl/owner/stats" -Method GET -WebSession $session
    Write-Host "✅ Owner stats accessible" -ForegroundColor Green
    Write-Host "Response: $($statsResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Owner stats access failed (expected for user role): $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

Write-Host "`n🏢 Test 4: Create a client server (to become owner)" -ForegroundColor Yellow

$clientServerBody = @{
    appName = "Test Application"
    schemaName = "test_app_schema"
    clientMode = "frontend-login-proxy"
    allowedReturnUrls = @("http://localhost:4000", "http://localhost:4000/dashboard")
} | ConvertTo-Json

try {
    $clientResponse = Invoke-WebRequest -Uri "$baseUrl/clientServer/user/register" -Method POST -Body $clientServerBody -ContentType "application/json" -WebSession $session
    Write-Host "✅ Client server creation successful" -ForegroundColor Green
    Write-Host "Response: $($clientResponse.Content)" -ForegroundColor Gray
    
    # Parse the response to get client ID
    $clientData = $clientResponse.Content | ConvertFrom-Json
    $clientId = $clientData.data.client_id
    Write-Host "📋 Client ID: $clientId" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Client server creation failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

Write-Host "`n📊 Test 5: Try owner stats again (should work now - owner role)" -ForegroundColor Yellow

try {
    $statsResponse = Invoke-WebRequest -Uri "$baseUrl/owner/stats" -Method GET -WebSession $session
    Write-Host "✅ Owner stats accessible" -ForegroundColor Green
    Write-Host "Response: $($statsResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Owner stats access failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}

Write-Host "`n👥 Test 6: Get users in client schema" -ForegroundColor Yellow

if ($clientId) {
    try {
        $usersResponse = Invoke-WebRequest -Uri "$baseUrl/owner/clients/$clientId/users" -Method GET -WebSession $session
        Write-Host "✅ Users retrieved successfully" -ForegroundColor Green
        Write-Host "Response: $($usersResponse.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Users retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host "`n➕ Test 7: Create a user in client schema" -ForegroundColor Yellow

if ($clientId) {
    $newUserBody = @{
        name = "Test Client User"
        email = "testclientuser@example.com"
        password = "ClientUserPassword123!"
        role = "user"
    } | ConvertTo-Json

    try {
        $createUserResponse = Invoke-WebRequest -Uri "$baseUrl/owner/clients/$clientId/users" -Method POST -Body $newUserBody -ContentType "application/json" -WebSession $session
        Write-Host "✅ User created successfully" -ForegroundColor Green
        Write-Host "Response: $($createUserResponse.Content)" -ForegroundColor Gray
        
        # Parse response to get user ID
        $userData = $createUserResponse.Content | ConvertFrom-Json
        $userId = $userData.data.user_id
        Write-Host "📋 User ID: $userId" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ User creation failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host "`n✏️ Test 8: Update the created user" -ForegroundColor Yellow

if ($clientId -and $userId) {
    $updateUserBody = @{
        name = "Updated Test Client User"
        email = "testclientuser@example.com"
        role = "admin"
    } | ConvertTo-Json

    try {
        $updateUserResponse = Invoke-WebRequest -Uri "$baseUrl/owner/clients/$clientId/users/$userId" -Method PUT -Body $updateUserBody -ContentType "application/json" -WebSession $session
        Write-Host "✅ User updated successfully" -ForegroundColor Green
        Write-Host "Response: $($updateUserResponse.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ User update failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host "`n👥 Test 9: Get users again to verify changes" -ForegroundColor Yellow

if ($clientId) {
    try {
        $usersResponse = Invoke-WebRequest -Uri "$baseUrl/owner/clients/$clientId/users" -Method GET -WebSession $session
        Write-Host "✅ Users retrieved successfully" -ForegroundColor Green
        Write-Host "Response: $($usersResponse.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Users retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host "`n Test 10: Delete the created user" -ForegroundColor Yellow

if ($clientId -and $userId) {
    try {
        $deleteUserResponse = Invoke-WebRequest -Uri "$baseUrl/owner/clients/$clientId/users/$userId" -Method DELETE -WebSession $session
        Write-Host "✅ User deleted successfully" -ForegroundColor Green
        Write-Host "Response: $($deleteUserResponse.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ User deletion failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host "`n📈 Test 11: Get client analytics" -ForegroundColor Yellow

if ($clientId) {
    try {
        $analyticsResponse = Invoke-WebRequest -Uri "$baseUrl/owner/clients/$clientId/analytics" -Method GET -WebSession $session
        Write-Host "✅ Analytics retrieved successfully" -ForegroundColor Green
        Write-Host "Response: $($analyticsResponse.Content)" -ForegroundColor Gray
    } catch {
        Write-Host "❌ Analytics retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorContent = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            Write-Host "Error details: $($reader.ReadToEnd())" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎉 Owner Panel API Tests Completed!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green 