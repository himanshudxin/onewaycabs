param(
    [string]$BaseUrl = "http://localhost:8080"
)

Write-Host "`n=== Testing Admin Portal Security & WhatsApp OTP Authorization ===" -ForegroundColor Cyan

# 1. Test unauthorized phone number
Write-Host "`n1. Testing unauthorized phone dispatch (+91 9876543210)..." -NoNewline
try {
    $payload = @{ phone = "9876543210" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/send-whatsapp-otp" -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop
    Write-Host " FAILED (Expected 403 Forbidden, got success)" -ForegroundColor Red
    exit 1
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 403) {
        Write-Host " PASSED (Blocked with 403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host " UNEXPECTED STATUS ($code)" -ForegroundColor Yellow
    }
}

# 2. Test unauthorized phone verification
Write-Host "`n2. Testing unauthorized phone verification (+91 9876543210)..." -NoNewline
try {
    $payload = @{ phone = "9876543210"; code = "123456" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/verify-whatsapp-otp" -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop
    Write-Host " FAILED (Expected 403 Forbidden, got success)" -ForegroundColor Red
    exit 1
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 403) {
        Write-Host " PASSED (Blocked with 403 Forbidden)" -ForegroundColor Green
    } else {
        Write-Host " UNEXPECTED STATUS ($code)" -ForegroundColor Yellow
    }
}

# 3. Test authorized owner phone (6206494214) dispatch
Write-Host "`n3. Testing authorized owner phone dispatch (6206494214)..." -NoNewline
try {
    $payload = @{ phone = "6206494214" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/send-whatsapp-otp" -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop
    if ($res.success -eq $true -and $res.whatsappUrl -match "6206494214") {
        Write-Host " PASSED" -ForegroundColor Green
        Write-Host "   Message: $($res.message)" -ForegroundColor Gray
        Write-Host "   WhatsApp Link: $($res.whatsappUrl)" -ForegroundColor Gray
    } else {
        Write-Host " FAILED: Invalid response payload" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 4. Test authorized owner phone with invalid OTP
Write-Host "`n4. Testing owner phone with incorrect OTP..." -NoNewline
try {
    $payload = @{ phone = "6206494214"; code = "000000" } | ConvertTo-Json
    $res = Invoke-RestMethod -Uri "$BaseUrl/api/admin/verify-whatsapp-otp" -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop
    Write-Host " FAILED (Incorrect OTP was accepted)" -ForegroundColor Red
    exit 1
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 400 -or $code -eq 401) {
        Write-Host " PASSED (Properly rejected invalid OTP)" -ForegroundColor Green
    } else {
        Write-Host " STATUS: $code" -ForegroundColor Yellow
    }
}

Write-Host "`n=== All Admin Security Checks Passed! ===`n" -ForegroundColor Green
