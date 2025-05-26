# Test Trading Simulator with Existing Seed Users
# Purpose: Test the flow using pre-seeded Trading Simulator users

Write-Host "🎯 TRADING SIMULATOR EXISTING USERS TEST" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Use existing Trading Simulator users from seedData.json
$tradingUsers = @(
    @{ email = "mother@world.com"; password = "the-big-g"; name = "mother-theresa" },
    @{ email = "john@meta.com"; password = "john-creator-of-doom"; name = "john-mccarmack" },
    @{ email = "linus@linux.com"; password = "linux-creator_thats-me"; name = "Linus-Torvalds" }
)

# Headers to simulate Trading-sim origin
$tradingSimHeaders = @{
    "Origin" = "http://localhost:5173"
    "Referer" = "http://localhost:5173/home"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

foreach ($user in $tradingUsers) {
    Write-Host "🧪 Testing user: $($user.name) ($($user.email))" -ForegroundColor Yellow
    Write-Host ""
    
    # Create a fresh session for each user
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
    # Test Login
    $loginBody = @{ 
        credentials = @{
            email = $user.email
            password = $user.password
        }
        returnUrl = "http://localhost:5173/dashboard"  # Should redirect to Trading-sim dashboard
    } | ConvertTo-Json
    
    try {
        Write-Host "🔐 Attempting login..." -ForegroundColor Gray
        $login = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -WebSession $session -Headers $tradingSimHeaders
        Write-Host "✅ Login Success:" -ForegroundColor Green
        Write-Host ($login | ConvertTo-Json -Depth 3) -ForegroundColor Green
        
        # Analyze the response
        $userData = $login.data
        Write-Host ""
        Write-Host "🔍 User Analysis:" -ForegroundColor Cyan
        Write-Host "Role: $($userData.role)" -ForegroundColor $(if ($userData.role -eq "user") { "Green" } else { "Red" })
        Write-Host "Email: $($userData.email)" -ForegroundColor Green
        Write-Host "Name: $($userData.name)" -ForegroundColor Green
        
        if ($userData.poolMetadata) {
            Write-Host "Pool Metadata:" -ForegroundColor Gray
            Write-Host ($userData.poolMetadata | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        }
        
        # Test session check
        Write-Host ""
        Write-Host "🔍 Testing session check..." -ForegroundColor Gray
        $sessionCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/session" -Method GET -WebSession $session -Headers $tradingSimHeaders
        Write-Host "✅ Session Check Success:" -ForegroundColor Green
        
        $sessionData = $sessionCheck.data
        Write-Host "Session Role: $($sessionData.role)" -ForegroundColor $(if ($sessionData.role -eq "user") { "Green" } else { "Red" })
        
        if ($sessionData.poolMetadata) {
            Write-Host "Session Pool Metadata:" -ForegroundColor Gray
            Write-Host ($sessionData.poolMetadata | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "✅ SUCCESS: User $($user.name) can login and maintain session!" -ForegroundColor Green
        Write-Host "=" * 60 -ForegroundColor Gray
        Write-Host ""
        
        # Test logout
        try {
            $logout = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/logout" -Method POST -WebSession $session -Headers $tradingSimHeaders
            Write-Host "✅ Logout Success for $($user.name)" -ForegroundColor Green
        } catch {
            Write-Host "❌ Logout Failed for $($user.name)" -ForegroundColor Red
        }
        
        break  # Exit after first successful user
        
    } catch {
        Write-Host "❌ Login Failed for $($user.name):" -ForegroundColor Red
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        continue
    }
}

Write-Host ""
Write-Host "📊 EXPECTED BEHAVIOR:" -ForegroundColor Cyan
Write-Host "- User should have role: 'user'" -ForegroundColor Gray
Write-Host "- User should be in Trading Simulator tenant schema" -ForegroundColor Gray
Write-Host "- Return URL should redirect to localhost:5173/dashboard" -ForegroundColor Gray
Write-Host "- Session should persist for Trading-sim requests" -ForegroundColor Gray 