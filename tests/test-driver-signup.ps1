$baseUrl = "http://localhost:8080"
Write-Host "`n=== Testing Driver Partner Sign Up Flow ===" -ForegroundColor Cyan

# 1. Test missing fields
Write-Host "1. Testing validation (missing name)..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/driver/signup" -Method Post -ContentType "application/json" -Body '{"phone":"9835099999"}' -ErrorAction Stop
    Write-Host " FAILED (should have rejected)" -ForegroundColor Red
    exit 1
} catch {
    Write-Host " PASSED ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Green
}

# 2. Test valid driver registration
$testPhone = "98" + (Get-Random -Minimum 10000000 -Maximum 99999999)
$payload = @{
    name = "Vijay Prakash Yadav"
    phone = $testPhone
    city = "Gaya"
    vehicleModel = "Maruti Suzuki Ertiga"
    vehicleNumber = "BR 02 PB 9876"
    licenseNumber = "BR-0220190001234"
    experienceYears = "5-10 Years"
} | ConvertTo-Json

Write-Host "2. Submitting valid driver registration (Phone: $testPhone)..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/driver/signup" -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop
    if ($res.success -and $res.applicationId -and $res.message -match "verify") {
        Write-Host " PASSED" -ForegroundColor Green
        Write-Host "   Application ID: $($res.applicationId)" -ForegroundColor Gray
        Write-Host "   Message: $($res.message)" -ForegroundColor Gray
    } else {
        Write-Host " FAILED: unexpected response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 3. Test duplicate phone rejection
Write-Host "3. Testing duplicate phone rejection..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "$baseUrl/api/driver/signup" -Method Post -ContentType "application/json" -Body $payload -ErrorAction Stop
    Write-Host " FAILED (Allowed duplicate)" -ForegroundColor Red
    exit 1
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 409) {
        Write-Host " PASSED (Properly returned 409 Conflict)" -ForegroundColor Green
    } else {
        Write-Host " STATUS: $code" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Driver Partner Sign Up Test Passed! ===`n" -ForegroundColor Green
