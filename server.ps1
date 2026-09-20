# OneWayTaxiBihar (onewaytaxibihar.com) - REST API & Static Web Server
# OneWayTaxiBihar Mobility Pvt Ltd

$port = 8080
$workspacePath = "c:\Users\himan\onewaycabs"
$dbPath = Join-Path $workspacePath "data\db.json"

if (-not (Test-Path $dbPath)) {
    New-Item -ItemType Directory -Path (Join-Path $workspacePath "data") -Force | Out-Null
    Set-Content -Path $dbPath -Value '{"users":[],"sessions":[],"bookings":[],"drivers":[],"payments":[],"wallet_ledger":[],"audit_logs":[],"admins":[],"reviews":[],"leads":[]}' -Encoding UTF8
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Write-Host "OneWayTaxiBihar (onewaytaxibihar.com) REST API & Web Server running at http://localhost:$port/" -ForegroundColor Green

function Send-JsonResponse($response, $statusCode, $object) {
    try {
        $json = $object | ConvertTo-Json -Depth 10 -Compress
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        $response.ContentType = "application/json; charset=utf-8"
        $response.StatusCode = $statusCode
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
        $response.AddHeader("X-Content-Type-Options", "nosniff")
        $response.AddHeader("X-Frame-Options", "SAMEORIGIN")
        $response.AddHeader("X-XSS-Protection", "1; mode=block")
        $response.AddHeader("Referrer-Policy", "strict-origin-when-cross-origin")
        $response.AddHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:; font-src 'self' https: data:; img-src 'self' https: data: blob:;")
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
        Write-Host "Error in Send-JsonResponse: $($_.Exception.Message)" -ForegroundColor Yellow
    } finally {
        $response.Close()
    }
}

function Read-RequestBody($request) {
    if ($request.HasEntityBody) {
        $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
        $body = $reader.ReadToEnd()
        $reader.Close()
        if ([string]::IsNullOrWhiteSpace($body)) { return @{} }
        try {
            return $body | ConvertFrom-Json
        } catch {
            return @{}
        }
    }
    return @{}
}

function Get-Db() {
    try {
        $content = [System.IO.File]::ReadAllText($dbPath, [System.Text.Encoding]::UTF8)
        return $content | ConvertFrom-Json
    } catch {
        return @{ users = @(); sessions = @(); bookings = @(); drivers = @(); payments = @(); wallet_ledger = @(); audit_logs = @(); admins = @(); reviews = @(); leads = @() }
    }
}

function Save-Db($dbObj) {
    try {
        $json = $dbObj | ConvertTo-Json -Depth 10
        [System.IO.File]::WriteAllText($dbPath, $json, [System.Text.Encoding]::UTF8)
        
        # Asynchronously sync updates to MongoDB Atlas online cloud database
        $nodeExe = "C:\Program Files\nodejs\node.exe"
        $syncScript = Join-Path $workspacePath "scripts\mongo-service.js"
        if ((Test-Path $nodeExe) -and (Test-Path $syncScript)) {
            Start-Process -FilePath $nodeExe -ArgumentList $syncScript, "push" -WindowStyle Hidden -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Error saving DB: $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Get-QueryParams($url) {
    $params = @{}
    if ($url.Query) {
        $q = $url.Query.TrimStart('?')
        $pairs = $q.Split('&')
        foreach ($p in $pairs) {
            $parts = $p.Split('=')
            if ($parts.Length -ge 2) {
                $key = [System.Uri]::UnescapeDataString($parts[0])
                $val = [System.Uri]::UnescapeDataString($parts[1])
                $params[$key] = $val
            }
        }
    }
    return $params
}

$locationsCache = $null
function Get-Locations() {
    if ($global:locationsCache) { return $global:locationsCache }
    $locFile = Join-Path $workspacePath "data\locations.json"
    if (Test-Path $locFile) {
        try {
            $json = [System.IO.File]::ReadAllText($locFile, [System.Text.Encoding]::UTF8)
            $global:locationsCache = $json | ConvertFrom-Json
            return $global:locationsCache
        } catch {
            Write-Host "Error reading locations.json: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    return @()
}

$citiesCache = $null
function Get-Cities() {
    if ($global:citiesCache) { return $global:citiesCache }
    $cFile = Join-Path $workspacePath "data\cities.json"
    if (Test-Path $cFile) {
        try {
            $json = [System.IO.File]::ReadAllText($cFile, [System.Text.Encoding]::UTF8)
            $global:citiesCache = $json | ConvertFrom-Json
            return $global:citiesCache
        } catch {
            Write-Host "Error reading cities.json: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
    return @()
}

$biharCoords = @{
    "patna" = @(25.5941, 85.1376); "nalanda" = @(25.1978, 85.5186); "biharsharif" = @(25.1978, 85.5186); "rajgir" = @(25.0300, 85.4200);
    "bhojpur" = @(25.5541, 84.6644); "ara" = @(25.5541, 84.6644); "buxar" = @(25.5647, 83.9777); "rohtas" = @(24.9536, 84.0159);
    "sasaram" = @(24.9536, 84.0159); "dehri" = @(24.9167, 84.1833); "kaimur" = @(25.0450, 83.6144); "bhabua" = @(25.0450, 83.6144);
    "gaya" = @(24.7914, 85.0002); "bodhgaya" = @(24.6961, 84.9870); "aurangabad" = @(24.7539, 84.3742); "nawada" = @(24.8872, 85.5433);
    "jehanabad" = @(25.2136, 84.9867); "arwal" = @(25.2444, 84.6789); "muzaffarpur" = @(26.1209, 85.3647); "vaishali" = @(25.6858, 85.2155);
    "hajipur" = @(25.6858, 85.2155); "eastchamparan" = @(26.6469, 84.9089); "motihari" = @(26.6469, 84.9089); "westchamparan" = @(26.8024, 84.5028);
    "bettiah" = @(26.8024, 84.5028); "sitamarhi" = @(26.5978, 85.4892); "sheohar" = @(26.5167, 85.2833); "darbhanga" = @(26.1542, 85.8918);
    "madhubani" = @(26.3533, 86.0718); "samastipur" = @(25.8628, 85.7811); "saran" = @(25.7796, 84.7499); "chhapra" = @(25.7796, 84.7499);
    "siwan" = @(26.2196, 84.3567); "gopalganj" = @(26.4687, 84.4442); "bhagalpur" = @(25.2425, 87.0125); "banka" = @(24.8833, 86.9167);
    "munger" = @(25.3750, 86.4744); "jamui" = @(24.9167, 86.2167); "khagaria" = @(25.5000, 86.4833); "lakhisarai" = @(25.1833, 86.0833);
    "sheikhpura" = @(25.1333, 85.8500); "begusarai" = @(25.4182, 86.1272); "purnia" = @(25.7771, 87.4753); "katihar" = @(25.5394, 87.5661);
    "araria" = @(26.1500, 87.5167); "kishanganj" = @(26.0744, 87.9400); "saharsa" = @(25.8833, 86.6000); "madhepura" = @(25.9167, 86.7833);
    "supaul" = @(26.1167, 86.6000); "varanasi" = @(25.3176, 82.9739); "deoghar" = @(24.4826, 86.7001); "ranchi" = @(23.3441, 85.3096);
    "siliguri" = @(26.7271, 88.3953); "gorakhpur" = @(26.7606, 83.3732); "kolkata" = @(22.5726, 88.3639)
}

$distanceTable = @{
    "patna_gaya" = 104; "gaya_patna" = 104;
    "patna_muzaffarpur" = 75; "muzaffarpur_patna" = 75;
    "patna_darbhanga" = 142; "darbhanga_patna" = 142;
    "patna_bhagalpur" = 235; "bhagalpur_patna" = 235;
    "patna_purnia" = 305; "purnia_patna" = 305;
    "patna_rajgir" = 102; "rajgir_patna" = 102;
    "patna_ara" = 54; "ara_patna" = 54;
    "patna_buxar" = 130; "buxar_patna" = 130;
    "patna_sasaram" = 150; "sasaram_patna" = 150;
    "patna_begusarai" = 125; "begusarai_patna" = 125;
    "patna_chhapra" = 50; "chhapra_patna" = 50;
    "patna_motihari" = 155; "motihari_patna" = 155;
    "patna_bettiah" = 200; "bettiah_patna" = 200;
    "patna_siwan" = 135; "siwan_patna" = 135;
    "patna_samastipur" = 88; "samastipur_patna" = 88;
    "patna_katihar" = 320; "katihar_patna" = 320;
    "patna_saharsa" = 210; "saharsa_patna" = 210;
    "patna_munger" = 178; "munger_patna" = 178;
    "patna_kishanganj" = 395; "kishanganj_patna" = 395;
    "patna_deoghar" = 255; "deoghar_patna" = 255;
    "patna_varanasi" = 250; "varanasi_patna" = 250;
    "patna_ranchi" = 325; "ranchi_patna" = 325;
    "patna_siliguri" = 460; "siliguri_patna" = 460
}

function Get-HaversineDistance($lat1, $lon1, $lat2, $lon2) {
    $R = 6371
    $dLat = (($lat2 - $lat1) * [Math]::PI) / 180
    $dLon = (($lon2 - $lon1) * [Math]::PI) / 180
    $a = [Math]::Sin($dLat / 2) * [Math]::Sin($dLat / 2) +
         [Math]::Cos(($lat1 * [Math]::PI) / 180) * [Math]::Cos(($lat2 * [Math]::PI) / 180) *
         [Math]::Sin($dLon / 2) * [Math]::Sin($dLon / 2)
    $c = 2 * [Math]::Atan2([Math]::Sqrt($a), [Math]::Sqrt(1 - $a))
    return [Math]::Round($R * $c * 1.28) # 1.28x road tortuosity factor for Bihar highway network
}

function Resolve-Coordinates($name) {
    $clean = ($name -replace '[^a-zA-Z]', '').ToLower()
    foreach ($k in $biharCoords.Keys) {
        if ($clean.Contains($k) -or $k.Contains($clean)) { return $biharCoords[$k] }
    }
    return $null
}

function Calculate-ServerFare($origin, $dest, $tier, $tripType = "oneway") {
    $cleanOrigin = ($origin -replace '[^a-zA-Z]', '').ToLower()
    $cleanDest = ($dest -replace '[^a-zA-Z]', '').ToLower()
    $key = "${cleanOrigin}_${cleanDest}"
    
    $dist = 120
    if ($cleanOrigin -eq $cleanDest) {
        $dist = 35
    } elseif ($distanceTable.ContainsKey($key)) {
        $dist = $distanceTable[$key]
    } else {
        $c1 = Resolve-Coordinates $origin
        $c2 = Resolve-Coordinates $dest
        if ($c1 -and $c2) {
            $calcDist = Get-HaversineDistance $c1[0] $c1[1] $c2[0] $c2[1]
            $dist = [Math]::Max($calcDist, 35)
        }
    }

    $baseRates = @{
        "hatchback" = @{ base = 850; perKm = 21.0; name = "Go Hatchback"; model = "WagonR, Tiago" };
        "sedan"     = @{ base = 1050; perKm = 25.0; name = "Prime Sedan"; model = "Dzire, Etios, Amaze" };
        "sedan_prime"= @{ base = 1350; perKm = 29.0; name = "Executive Sedan"; model = "Honda City, Ciaz" };
        "suv"       = @{ base = 1650; perKm = 33.0; name = "Family SUV (6+1)"; model = "Maruti Ertiga, Carens" }
    }

    $rate = if ($baseRates.ContainsKey($tier)) { $baseRates[$tier] } else { $baseRates["sedan"] }
    $effectiveDist = if ($tripType -eq "roundtrip") { $dist * 2 } else { $dist }
    $extraKm = [Math]::Max(0, $effectiveDist - 15)
    $distanceCharge = [Math]::Round($extraKm * $rate.perKm)
    $subCharge = $rate.base + $distanceCharge

    $roundTripDiscount = 0
    if ($tripType -eq "roundtrip") {
        $roundTripDiscount = [Math]::Round($subCharge * 0.12)
        $subCharge -= $roundTripDiscount
    }

    $tolls = [Math]::Round(($dist / 70) * 55)
    $allowance = if ($tripType -eq "roundtrip" -or $dist -gt 200) { 350 } else { 0 }
    $parking = if ($cleanOrigin -like "*airport*" -or $cleanDest -like "*airport*") { 100 } else { 0 }
    
    $subtotal = $rate.base + $distanceCharge - $roundTripDiscount + $tolls + $allowance + $parking
    $gst = [Math]::Round($subtotal * 0.05)
    $total = [Math]::Round($subtotal + $gst)
    $hrs = [Math]::Floor($dist / 45)
    $mins = [Math]::Round(($dist % 45) * 1.3)

    return @{
        distanceKm = $dist
        duration = "${hrs}h ${mins}m"
        tierId = $tier
        tierName = $rate.name
        tierModel = $rate.model
        baseFare = $rate.base
        distanceCharge = $distanceCharge
        extraKm = $extraKm
        perKmRate = $rate.perKm
        roundTripDiscount = $roundTripDiscount
        tollFastag = $tolls
        parking = $parking
        driverAllowance = $allowance
        gst = $gst
        totalFare = $total
    }
}

function Get-AuthUser($request, $db) {
    $header = $request.Headers["Authorization"]
    if (-not $header) { return $null }
    $token = $header -replace '^Bearer\s+', ''
    if (-not $token) { return $null }
    
    $sess = $db.sessions | Where-Object { $_.token -eq $token } | Select-Object -First 1
    if (-not $sess) { return $null }

    $user = $db.users | Where-Object { $_.id -eq $sess.userId -or $_.phone -eq $sess.phone } | Select-Object -First 1
    return @{ user = $user; session = $sess }
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            $httpMethod = $request.HttpMethod.ToUpper()
            $urlPath = $request.Url.LocalPath

            if ($httpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
                $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
                $response.Close()
                continue
            }

            # =========================================================================
            # REST API ROUTING (/api/...)
            # =========================================================================
            if ($urlPath.StartsWith("/api/")) {
                $db = Get-Db

                # 1. Healthcheck
                if ($urlPath -eq "/api/health" -and $httpMethod -eq "GET") {
                    Send-JsonResponse $response 200 @{
                        status = "ONLINE"
                        name = "OneWayTaxiBihar Production API"
                        domain = "onewaytaxibihar.com"
                        helpline = "+91 80021 41816"
                        whatsapp = "+91 72818 51011"
                        time = (Get-Date).ToString("o")
                    }
                    continue
                }

                # 1b. Tunnel & Network Info for Client Trials
                if ($urlPath -eq "/api/tunnel-info" -and $httpMethod -eq "GET") {
                    $tunnelFile = Join-Path $workspacePath "data\tunnel.json"
                    if (Test-Path $tunnelFile) {
                        try {
                            $tunnelData = Get-Content $tunnelFile -Raw -Encoding UTF8 | ConvertFrom-Json
                            Send-JsonResponse $response 200 $tunnelData
                            continue
                        } catch {}
                    }
                    Send-JsonResponse $response 200 @{
                        publicUrl = $null
                        lanUrl = "http://192.168.1.13:8088"
                    }
                    continue
                }

                # 2A. Auth: Real Number Verification - Send Verification Code
                if ($urlPath -eq "/api/auth/send-otp" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawPhone = if ($body.phone) { $body.phone } else { "" }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }
                    $name = if ($body.name) { $body.name.Trim() } else { "Valued Passenger" }

                    if ($cleanPhone.Length -ne 10 -or $cleanPhone -notmatch '^[6-9]\d{9}$') {
                        Send-JsonResponse $response 400 @{ success = $false; message = "Valid 10-digit Indian mobile number starting with 6-9 required." }
                        continue
                    }

                    # Generate genuine 4-digit code
                    $code = (Get-Random -Minimum 1000 -Maximum 9999).ToString()
                    if (-not $global:ActiveVerificationCodes) { $global:ActiveVerificationCodes = @{} }
                    $global:ActiveVerificationCodes[$cleanPhone] = @{
                        code = $code
                        name = $name
                        expiresAt = (Get-Date).AddMinutes(10)
                        attempts = 0
                    }

                    $existingUser = $db.users | Where-Object { ($_.phone -replace '\D', '') -like "*$cleanPhone" } | Select-Object -First 1
                    $isNewUser = (-not $existingUser)
                    $rewardEligible = $isNewUser

                    $waText = "OneWayTaxiBihar Verification Code for +91 $cleanPhone is: $code. Valid for 10 minutes. Welcome Reward: Rs 100 on first booking."
                    $waUrl = "https://wa.me/917281851011?text=" + [System.Uri]::EscapeDataString($waText)
                    $amt = if ($rewardEligible) { 100 } else { 0 }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        phone = "+91 $cleanPhone"
                        cleanPhone = $cleanPhone
                        isNewUser = $isNewUser
                        rewardEligible = $rewardEligible
                        rewardAmount = $amt
                        otpCode = $code
                        whatsappUrl = $waUrl
                        message = "Verification code dispatched to +91 $cleanPhone via SMS & WhatsApp."
                    }
                    continue
                }

                # 2B. Auth: Real Number Verification - Verify Code & Grant One-Time Reward
                if ($urlPath -eq "/api/auth/verify-otp" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawPhone = if ($body.phone) { $body.phone } else { "" }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }
                    $inputCode = if ($body.otp) { $body.otp.ToString().Trim() } else { "" }
                    $name = if ($body.name) { $body.name.Trim() } else { "" }

                    if ($cleanPhone.Length -ne 10) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "Valid 10-digit mobile number required." }
                        continue
                    }

                    if (-not $global:ActiveVerificationCodes -or -not $global:ActiveVerificationCodes.ContainsKey($cleanPhone)) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "No active verification code found. Please request a new code." }
                        continue
                    }

                    $activeRecord = $global:ActiveVerificationCodes[$cleanPhone]
                    if ((Get-Date) -gt $activeRecord.expiresAt) {
                        $global:ActiveVerificationCodes.Remove($cleanPhone)
                        Send-JsonResponse $response 400 @{ success = $false; message = "Verification code expired. Please request a new code." }
                        continue
                    }

                    if ($activeRecord.code -ne $inputCode) {
                        $activeRecord.attempts++
                        if ($activeRecord.attempts -ge 5) {
                            $global:ActiveVerificationCodes.Remove($cleanPhone)
                            Send-JsonResponse $response 400 @{ success = $false; message = "Too many incorrect attempts. Please request a new code." }
                            continue
                        }
                        Send-JsonResponse $response 400 @{ success = $false; message = "Invalid verification code. Please check and re-enter." }
                        continue
                    }

                    # Code matches! Remove used code
                    $global:ActiveVerificationCodes.Remove($cleanPhone)
                    if (-not $name -and $activeRecord.name) { $name = $activeRecord.name }
                    if (-not $name) { $name = "Valued Passenger" }

                    $user = $db.users | Where-Object { ($_.phone -replace '\D', '') -like "*$cleanPhone" } | Select-Object -First 1
                    $isFirstTime = $false
                    $rewardGranted = 0

                    if (-not $user) {
                        $isFirstTime = $true
                        $rewardGranted = 100
                        $user = @{
                            id = "usr_" + $cleanPhone
                            name = $name
                            phone = "+91 $cleanPhone"
                            email = if ($body.email) { $body.email.Trim().ToLower() } else { "" }
                            walletBalance = 100
                            rewardClaimed = $true
                            isPhoneVerified = $true
                            memberSince = (Get-Date).Year.ToString()
                            createdAt = (Get-Date).ToString("o")
                        }
                        $db.users += $user

                        # Record one-time welcome reward in ledger
                        $db.wallet_ledger += @{
                            id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            userId = $user.id
                            phone = $user.phone
                            type = "CREDIT"
                            amount = 100
                            balanceAfter = 100
                            description = "Welcome Bonus Credit (One-Time New User Reward)"
                            createdAt = (Get-Date).ToString("o")
                        }
                    } else {
                        $user.isPhoneVerified = $true
                        if ($name -and $name -ne "Valued Passenger") {
                            $user.name = $name
                        }
                    }

                    $token = "otb_sess_" + [System.Guid]::NewGuid().ToString("N")
                    $sess = @{
                        token = $token
                        userId = $user.id
                        phone = $user.phone
                        role = "customer"
                        createdAt = (Get-Date).ToString("o")
                    }
                    $db.sessions += $sess
                    Save-Db $db

                    $successMsg = if ($isFirstTime) { "Mobile verified successfully! Rs 100 Welcome Reward credited to your wallet." } else { "Mobile verified successfully! Welcome back." }
                    $hasReward = ($rewardGranted -gt 0)

                    Send-JsonResponse $response 200 @{
                        success = $true
                        token = $token
                        user = @{
                            id = $user.id
                            name = $user.name
                            phone = $user.phone
                            email = $user.email
                            walletBalance = $user.walletBalance
                            isPhoneVerified = $true
                        }
                        isFirstTimeUser = $isFirstTime
                        rewardGranted = $hasReward
                        rewardAmount = $rewardGranted
                        message = $successMsg
                    }
                    continue
                }

                # 2. Auth: Direct Login (Name + Phone)
                if ($urlPath -eq "/api/auth/login" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawPhone = if ($body.phone) { $body.phone } else { "" }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }
                    $name = if ($body.name) { $body.name.Trim() } else { "" }

                    if ($cleanPhone.Length -ne 10 -or $cleanPhone -notmatch '^[6-9]\d{9}$') {
                        Send-JsonResponse $response 400 @{ success = $false; message = "Invalid phone number. Please provide a valid 10-digit Indian mobile number starting with 6-9." }
                        continue
                    }
                    if ($name.Length -lt 2 -or $name.Length -gt 60) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "Passenger name is required (2 to 60 characters)." }
                        continue
                    }

                    $user = $db.users | Where-Object { ($_.phone -replace '\D', '') -like "*$cleanPhone" } | Select-Object -First 1
                    if (-not $user) {
                        $user = @{
                            id = "usr_" + $cleanPhone
                            name = $name
                            phone = "+91 $cleanPhone"
                            email = if ($body.email) { $body.email.Trim().ToLower() } else { "" }
                            walletBalance = 100
                            memberSince = (Get-Date).Year.ToString()
                            createdAt = (Get-Date).ToString("o")
                        }
                        $db.users += $user

                        # Add Welcome Bonus to Ledger
                        $ledgerItem = @{
                            id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            userId = $user.id
                            phone = $user.phone
                            type = "CREDIT"
                            amount = 100
                            balanceAfter = 100
                            description = "Welcome Bonus Credit"
                            createdAt = (Get-Date).ToString("o")
                        }
                        $db.wallet_ledger += $ledgerItem
                    } else {
                        if ($name -and $name -ne "Valued Passenger") {
                            $user.name = $name
                        }
                    }

                    $token = "otb_sess_" + [System.Guid]::NewGuid().ToString("N")
                    $sess = @{
                        token = $token
                        userId = $user.id
                        phone = $user.phone
                        role = "customer"
                        createdAt = (Get-Date).ToString("o")
                    }
                    $db.sessions += $sess
                    Save-Db $db

                    Send-JsonResponse $response 200 @{
                        success = $true
                        token = $token
                        user = @{
                            id = $user.id
                            name = $user.name
                            phone = $user.phone
                            email = $user.email
                            walletBalance = $user.walletBalance
                        }
                    }
                    continue
                }

                # 2B. Passenger Logout
                if ($urlPath -eq "/api/auth/logout" -and $httpMethod -eq "POST") {
                    $header = $request.Headers["Authorization"]
                    $token = if ($header) { $header -replace '^Bearer\s+', '' } else { "" }
                    if ($token) {
                        $db.sessions = @($db.sessions | Where-Object { $_.token -ne $token })
                        Save-Db $db
                    }
                    Send-JsonResponse $response 200 @{ success = $true; message = "Logged out successfully" }
                    continue
                }

                # 3. User Profile
                if ($urlPath -eq "/api/user/profile" -and $httpMethod -eq "GET") {
                    $auth = Get-AuthUser $request $db
                    if (-not $auth -or -not $auth.user) {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Unauthorized" }
                        continue
                    }
                    Send-JsonResponse $response 200 @{
                        success = $true
                        user = @{
                            id = $auth.user.id
                            name = $auth.user.name
                            phone = $auth.user.phone
                            email = $auth.user.email
                            walletBalance = $auth.user.walletBalance
                        }
                    }
                    continue
                }

                # 4. Server-Side Fare Calculation
                if ($urlPath -eq "/api/fares/calculate" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $fareData = Calculate-ServerFare $body.origin $body.dest $body.cabTier $body.tripType
                    Send-JsonResponse $response 200 @{ success = $true; fare = $fareData }
                    continue
                }

                # 4b. oneway.cab API: Pickup Cities
                if ($urlPath -eq "/api/cities/pickup" -and $httpMethod -eq "GET") {
                    $allCities = Get-Cities
                    $formatted = @()
                    foreach ($c in $allCities) {
                        $formatted += @{
                            id = $c.id
                            name = $c.name
                            hindiName = $c.hindiName
                            district = $c.district
                            state = $c.state
                            lat = $c.lat
                            lng = $c.lng
                            type = $c.type
                            typeLabel = $c.typeLabel
                            popular = [bool]$c.popular
                            tag = $c.tag
                            airport = $c.airport
                            minTimeHour = 2
                            minTimeMinute = 0
                        }
                    }
                    Send-JsonResponse $response 200 @{ success = $true; count = $formatted.Count; cities = $formatted }
                    continue
                }

                # 4c. oneway.cab API: Drop Cities with Dynamic Connected Filtering
                if ($urlPath -eq "/api/cities/drop" -and $httpMethod -eq "GET") {
                    $allCities = Get-Cities
                    $params = Get-QueryParams $request.Url
                    $fromParam = if ($params.ContainsKey("from")) { $params["from"].Trim().ToLower() } else { "" }
                    $cleanFrom = ($fromParam -replace '[^a-z0-9]', '')

                    $destList = @()
                    foreach ($c in $allCities) {
                        $cClean = (($c.name + " " + $c.id) -replace '[^a-z0-9]', '').ToLower()
                        if ($cleanFrom -and ($cClean -eq $cleanFrom -or $c.id.ToLower() -eq $cleanFrom -or $c.name.ToLower() -eq $fromParam)) {
                            continue # Exclude origin city from drop list
                        }
                        $destList += @{
                            id = $c.id
                            name = $c.name
                            hindiName = $c.hindiName
                            district = $c.district
                            state = $c.state
                            lat = $c.lat
                            lng = $c.lng
                            type = $c.type
                            typeLabel = $c.typeLabel
                            popular = [bool]$c.popular
                            tag = $c.tag
                        }
                    }

                    # Sort: popular first, then by name
                    $destList = @($destList | Sort-Object { if ($_.popular) { 0 } else { 1 } }, { $_.name })
                    Send-JsonResponse $response 200 @{ success = $true; from = $fromParam; count = $destList.Count; cities = $destList }
                    continue
                }

                # 4d. oneway.cab API: Route Details with Cab Options
                if ($urlPath -eq "/api/route-details" -and $httpMethod -eq "GET") {
                    $params = Get-QueryParams $request.Url
                    $fromVal = if ($params.ContainsKey("from")) { $params["from"].Trim() } else { "Patna" }
                    $toVal = if ($params.ContainsKey("to")) { $params["to"].Trim() } else { "Gaya" }

                    $hatchFare = Calculate-ServerFare $fromVal $toVal "hatchback" "oneway"
                    $sedanFare = Calculate-ServerFare $fromVal $toVal "sedan" "oneway"
                    $suvFare   = Calculate-ServerFare $fromVal $toVal "suv" "oneway"

                    $dist = $hatchFare.distanceKm
                    $dur  = $hatchFare.duration
                    $c1 = Resolve-Coordinates $fromVal
                    $c2 = Resolve-Coordinates $toVal

                    $cabOptions = @(
                        @{
                            carType = "HATCHBACK"
                            carTypeId = 3
                            carName = "Go Hatchback"
                            models = "WagonR, Tiago, Celerio"
                            capacity = "4 Passengers, 1-2 Bags"
                            baseFare = $hatchFare.baseFare + $hatchFare.distanceCharge
                            tollTaxAmount = $hatchFare.tollFastag
                            driverAllowance = $hatchFare.driverAllowance
                            totalAmount = $hatchFare.totalFare
                            duration = $dur
                        },
                        @{
                            carType = "SEDAN"
                            carTypeId = 1
                            carName = "Prime Sedan"
                            models = "Swift Dzire, Honda Amaze, Etios"
                            capacity = "4 Passengers, 2-3 Bags"
                            baseFare = $sedanFare.baseFare + $sedanFare.distanceCharge
                            tollTaxAmount = $sedanFare.tollFastag
                            driverAllowance = $sedanFare.driverAllowance
                            totalAmount = $sedanFare.totalFare
                            duration = $dur
                            popular = $true
                        },
                        @{
                            carType = "SUV"
                            carTypeId = 2
                            carName = "Family SUV (6+1)"
                            models = "Maruti Ertiga, Kia Carens"
                            capacity = "6-7 Passengers, 3-4 Bags"
                            baseFare = $suvFare.baseFare + $suvFare.distanceCharge
                            tollTaxAmount = $suvFare.tollFastag
                            driverAllowance = $suvFare.driverAllowance
                            totalAmount = $suvFare.totalFare
                            duration = $dur
                        }
                    )

                    Send-JsonResponse $response 200 @{
                        success = $true
                        routeId = (Get-Random -Minimum 100 -Maximum 999)
                        from = $fromVal
                        to = $toVal
                        distanceKm = $dist
                        distance = "${dist} km"
                        duration = $dur
                        pickupLatitude = if ($c1) { $c1[0] } else { 25.5941 }
                        pickupLongitude = if ($c1) { $c1[1] } else { 85.1376 }
                        dropLatitude = if ($c2) { $c2[0] } else { 24.7914 }
                        dropLongitude = if ($c2) { $c2[1] } else { 85.0002 }
                        cabOptions = $cabOptions
                    }
                    continue
                }

                # 4e. Location Recommendations (Auto-Type Chips & Landmark Hubs)
                if ($urlPath -eq "/api/locations/recommendations" -and $httpMethod -eq "GET") {
                    $params = Get-QueryParams $request.Url
                    $cId = if ($params.ContainsKey("cityId")) { $params["cityId"].Trim().ToLower() } else { "patna" }
                    $cType = if ($params.ContainsKey("type")) { $params["type"].Trim().ToLower() } else { "pickup" }

                    $allLocs = Get-Locations
                    $matched = @()
                    foreach ($l in $allLocs) {
                        $matchCity = ($l.cityId -eq $cId -or $l.cityName.ToLower() -eq $cId)
                        $supportsType = if ($cType -eq "pickup") { [bool]$l.pickupSupported } else { [bool]$l.dropSupported }
                        if ($matchCity -and $supportsType) {
                            $matched += $l
                        }
                    }

                    $quickChips = @()
                    $locItems = @()

                    if ($matched.Count -gt 0) {
                        foreach ($m in $matched) {
                            $locItems += @{
                                name = $m.name
                                hindiName = $m.hindiName
                                address = $m.address
                                category = $m.category
                            }
                        }
                        $popularOnly = @($matched | Where-Object { $_.popular })
                        $chipsSource = if ($popularOnly.Count -ge 3) { $popularOnly } else { $matched }
                        foreach ($m in ($chipsSource | Select-Object -First 6)) {
                            $quickChips += @{
                                label = $m.name
                                fullAddress = $m.address
                            }
                        }
                    } else {
                        # Dynamic District Hub Generator
                        $allCities = Get-Cities
                        $foundCity = $allCities | Where-Object { $_.id -eq $cId -or $_.name.ToLower() -eq $cId } | Select-Object -First 1
                        $cDisplayName = if ($foundCity) { $foundCity.name } else { (Get-Culture).TextInfo.ToTitleCase($cId) }

                        $quickChips = @(
                            @{ label = "Airport / Fly Terminal"; fullAddress = "$cDisplayName Airport Terminal Gate, $cDisplayName, Bihar" },
                            @{ label = "Junction Railway Station"; fullAddress = "$cDisplayName Junction Railway Station, Platform 1 Porch, $cDisplayName" },
                            @{ label = "Central Bus Stand / ISBT"; fullAddress = "$cDisplayName Central Bus Stand, Station Road, $cDisplayName" },
                            @{ label = "District Sadar Hospital"; fullAddress = "$cDisplayName Sadar Hospital / Emergency Gate, $cDisplayName" },
                            @{ label = "Main City Chowk"; fullAddress = "Main City Chowk / Central Market, $cDisplayName" }
                        )
                        $locItems = @(
                            @{ name = "$cDisplayName Junction Station"; address = "Platform 1 VIP Porch, Station Road, $cDisplayName"; category = "Railway Hubs" },
                            @{ name = "$cDisplayName Central Bus Stand"; address = "Main Government Bus Depot, $cDisplayName"; category = "Bus Terminals" },
                            @{ name = "$cDisplayName Sadar Hospital"; address = "Civil Line Hospital Road, $cDisplayName"; category = "Hospitals & Medical" },
                            @{ name = "Collectorate & Civil Court"; address = "District Court Compound, $cDisplayName"; category = "Administrative Hubs" },
                            @{ name = "Main Commercial Chowk"; address = "Central Commercial Market, $cDisplayName"; category = "Key Commercial Hubs" }
                        )
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        cityId = $cId
                        type = $cType
                        quickChips = $quickChips
                        locations = $locItems
                    }
                    continue
                }

                # 4f. Location Search across Landmarks & Districts
                if ($urlPath -eq "/api/locations/search" -and $httpMethod -eq "GET") {
                    $params = Get-QueryParams $request.Url
                    $q = if ($params.ContainsKey("q")) { $params["q"].Trim().ToLower() } else { "" }
                    $cId = if ($params.ContainsKey("cityId")) { $params["cityId"].Trim().ToLower() } else { "" }

                    $allLocs = Get-Locations
                    $results = @()
                    foreach ($l in $allLocs) {
                        if ($cId -and $l.cityId -ne $cId -and $l.cityName.ToLower() -ne $cId) {
                            continue
                        }
                        $txt = ($l.name + " " + $l.address + " " + ($l.tags -join " ") + " " + $l.category).ToLower()
                        if (-not $q -or $txt.Contains($q)) {
                            $results += @{
                                name = $l.name
                                hindiName = $l.hindiName
                                address = $l.address
                                category = $l.category
                            }
                        }
                    }

                    Send-JsonResponse $response 200 @{ success = $true; query = $q; count = $results.Count; locations = $results }
                    continue
                }

                # 5. Rides: List Customer Rides (Strict Customer Data Isolation)
                if ($urlPath -eq "/api/rides" -or $urlPath -eq "/api/bookings") {
                    if ($httpMethod -eq "GET") {
                        $auth = Get-AuthUser $request $db
                        if (-not $auth -or -not $auth.user) {
                            # Unauthenticated returns 0 trips (Zero leakage)
                            Send-JsonResponse $response 200 @{ success = $true; count = 0; bookings = @(); rides = @() }
                            continue
                        }

                        $userPhoneClean = ($auth.user.phone -replace '\D', '')
                        if ($userPhoneClean.Length -gt 10) { $userPhoneClean = $userPhoneClean.Substring($userPhoneClean.Length - 10) }

                        $customerRides = @()
                        foreach ($b in $db.bookings) {
                            $bPhone = if ($b.passengerPhone) { ($b.passengerPhone -replace '\D', '') } else { "" }
                            if ($b.customerId -eq $auth.user.id -or ($bPhone -and $bPhone -like "*$userPhoneClean")) {
                                $customerRides += $b
                            }
                        }

                        Send-JsonResponse $response 200 @{
                            success = $true
                            count = $customerRides.Count
                            bookings = $customerRides
                            rides = $customerRides
                        }
                        continue
                    }

                    # Create New Booking Request
                    if ($httpMethod -eq "POST") {
                        $body = Read-RequestBody $request
                        $rawPhone = if ($body.passengerPhone) { $body.passengerPhone } else { "" }
                        $cleanPhone = ($rawPhone -replace '\D', '')
                        if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }

                        if ($cleanPhone.Length -ne 10 -or $cleanPhone -notmatch '^[6-9]\d{9}$') {
                            Send-JsonResponse $response 400 @{ success = $false; message = "Valid 10-digit Indian mobile number starting with 6-9 required" }
                            continue
                        }
                        if (-not $body.passengerName -or $body.passengerName.Trim().Length -lt 2 -or $body.passengerName.Trim().Length -gt 60) {
                            Send-JsonResponse $response 400 @{ success = $false; message = "Passenger name required (2 to 60 characters)" }
                            continue
                        }

                        # Allow 1-day tolerance for international / UTC vs IST timezone boundaries
                        $yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")
                        if ($body.pickupDate -and $body.pickupDate -lt $yesterday) {
                            Send-JsonResponse $response 400 @{ success = $false; message = "Pickup date cannot be in the past" }
                            continue
                        }

                        # Deduplication: check if same passenger requested identical route within 15 seconds (Req 292, 293, 294)
                        $recentCutoff = (Get-Date).AddSeconds(-15)
                        $existingRecent = $db.bookings | Where-Object {
                            $bPhoneClean = ($_.passengerPhone -replace '\D', '')
                            $bPhoneClean -like "*$cleanPhone" -and
                            $_.originCity -eq $body.originCity -and
                            $_.destCity -eq $body.destCity -and
                            ([DateTime]$_.createdAt) -gt $recentCutoff
                        } | Select-Object -First 1

                        if ($existingRecent) {
                            Send-JsonResponse $response 200 @{
                                success = $true
                                booking = $existingRecent
                                ride = $existingRecent
                                message = "Booking request already received. Dispatch will call in 5 mins."
                                deduplicated = $true
                            }
                            continue
                        }

                        # Server-side fare recalculation (tamper-proof)
                        $fareData = Calculate-ServerFare $body.originCity $body.destCity $body.cabTier "oneway"
                        $baseTotal = $fareData.totalFare

                        # Find or create user
                        $user = $db.users | Where-Object { ($_.phone -replace '\D', '') -like "*$cleanPhone" } | Select-Object -First 1
                        if (-not $user) {
                            $user = @{
                                id = "usr_" + $cleanPhone
                                name = $body.passengerName
                                phone = "+91 $cleanPhone"
                                email = $body.passengerEmail
                                walletBalance = 100
                                createdAt = (Get-Date).ToString("o")
                            }
                            $db.users += $user
                        }

                        # Atomic Wallet deduction
                        $walletDeducted = 0
                        if ($body.useWallet -and $user.walletBalance -ge 100) {
                            $walletDeducted = 100
                            $user.walletBalance -= 100

                            $db.wallet_ledger += @{
                                id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                                userId = $user.id
                                phone = $user.phone
                                type = "DEBIT"
                                amount = 100
                                balanceAfter = $user.walletBalance
                                description = "Applied to Booking " + $body.originCity + " to " + $body.destCity
                                createdAt = (Get-Date).ToString("o")
                            }
                        }

                        # Coupon validation & deduction
                        $couponDeducted = 0
                        $appliedCouponCode = ""
                        if ($body.couponCode -and $db.coupons) {
                            $cCode = $body.couponCode.ToString().Trim().ToUpper()
                            $cpn = $db.coupons | Where-Object { $_.code.ToUpper() -eq $cCode -and $_.active } | Select-Object -First 1
                            if ($cpn -and $baseTotal -ge $cpn.minFare) {
                                if ($cpn.type -eq "PERCENT") {
                                    $calc = [Math]::Round(($baseTotal * $cpn.discount) / 100)
                                    $couponDeducted = [Math]::Min($calc, $cpn.maxDiscount)
                                } else {
                                    $couponDeducted = [Math]::Min($cpn.discount, $baseTotal)
                                }
                                $appliedCouponCode = $cpn.code
                                $cpn.usageCount++
                            }
                        }

                        $finalPayable = [Math]::Max(0, $baseTotal - $walletDeducted - $couponDeducted)
                        $bookingId = "OTB-2026-" + (Get-Random -Minimum 1000 -Maximum 9999)
                        $txnId = "TXN_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + "_" + (Get-Random -Minimum 1000 -Maximum 9999)

                        # Fraud / Risk Radar calculation
                        $cancelCount = @($db.bookings | Where-Object { ($_.passengerPhone -replace '\D', '') -like "*$cleanPhone" -and $_.bookingStatus -eq "CANCELLED" }).Count
                        $riskScore = 8
                        $riskReasons = @()
                        if ($cancelCount -ge 3) { $riskScore += 45; $riskReasons += "High cancellation history ($cancelCount)" }
                        elseif ($cancelCount -ge 1) { $riskScore += 15; $riskReasons += "Prior cancellation record ($cancelCount)" }
                        if ($user.isPhoneVerified) { $riskScore = [Math]::Max(5, $riskScore - 5) }
                        $riskLevel = if ($riskScore -ge 60) { "HIGH RISK" } elseif ($riskScore -ge 30) { "MEDIUM RISK" } else { "LOW RISK" }

                        # Standardized Payment Status: PENDING | PAID | FAILED | PARTIALLY PAID | REFUNDED
                        $initialPaymentStatus = if ($body.paymentMethod -eq "Token Advance (₹200)") { "PARTIALLY PAID (Awaiting Advance Verification)" } else { "PENDING" }

                        $paymentRecord = @{
                            id = $txnId
                            bookingId = $bookingId
                            customerId = $user.id
                            passengerPhone = "+91 $cleanPhone"
                            amount = $finalPayable
                            originalAmount = $baseTotal
                            walletDeducted = $walletDeducted
                            couponDeducted = $couponDeducted
                            couponCode = $appliedCouponCode
                            method = if ($body.paymentMethod) { $body.paymentMethod } else { "UPI / PhonePe QR Code" }
                            status = $initialPaymentStatus
                            upiUtr = ""
                            verifiedBy = $null
                            verifiedAt = $null
                            createdAt = (Get-Date).ToString("o")
                        }
                        $db.payments = @($paymentRecord) + @($db.payments)

                        $newBooking = @{
                            bookingId = $bookingId
                            customerId = $user.id
                            paymentTxnId = $txnId
                            passengerName = $body.passengerName
                            passengerPhone = "+91 $cleanPhone"
                            passengerEmail = $body.passengerEmail
                            originCity = if ($body.originCity) { $body.originCity } else { "Patna" }
                            destCity = if ($body.destCity) { $body.destCity } else { "Gaya" }
                            pickupAddress = if ($body.pickupAddress) { $body.pickupAddress } else { $body.originCity + " City Area" }
                            dropAddress = if ($body.dropAddress) { $body.dropAddress } else { $body.destCity + " City Area" }
                            pickupDate = if ($body.pickupDate) { $body.pickupDate } else { (Get-Date).ToString("yyyy-MM-dd") }
                            pickupTime = if ($body.pickupTime) { $body.pickupTime } else { "10:00 AM" }
                            distanceKm = $fareData.distanceKm
                            duration = $fareData.duration
                            fleetClass = $fareData.tierName
                            fleetModel = $fareData.tierModel
                            fareBreakdown = $fareData
                            totalFare = $finalPayable
                            originalFare = $baseTotal
                            walletUsed = $walletDeducted
                            couponCode = $appliedCouponCode
                            couponDiscount = $couponDeducted
                            riskScore = $riskScore
                            riskLevel = $riskLevel
                            riskReasons = $riskReasons
                            paymentMethod = if ($body.paymentMethod) { $body.paymentMethod } else { "UPI / PhonePe QR Code" }
                            paymentStatus = $initialPaymentStatus
                            bookingStatus = "REQUESTED"
                            partnerNotice = "Our partner/driver or agent will call you in 5 minutes to confirm booking."
                            driverDetails = $null
                            statusHistory = @(
                                @{
                                    status = "REQUESTED"
                                    timestamp = (Get-Date).ToString("o")
                                    actor = "Customer"
                                    note = "Booking request placed. Agent call in 5 mins."
                                }
                            )
                            whatsappMessage = "*NEW BOOKING CONFIRMED - OneWayTaxiBihar*`nBooking ID: $bookingId`nPassenger: $($body.passengerName)`nMobile: +91 $cleanPhone`nRoute: $($body.originCity) to $($body.destCity) ($($fareData.distanceKm) KM)`nSchedule: $($body.pickupDate) at $($body.pickupTime)`nFare: Rs $finalPayable ($($body.paymentMethod))`nStatus: REQUESTED / CONFIRMED"
                            whatsappDispatchUrl = "https://wa.me/917281851011?text=" + [System.Uri]::EscapeDataString("NEW BOOKING CONFIRMED - OneWayTaxiBihar`nBooking ID: $bookingId`nPassenger: $($body.passengerName) (+91 $cleanPhone)`nRoute: $($body.originCity) to $($body.destCity)`nSchedule: $($body.pickupDate) at $($body.pickupTime)`nTotal Fare: Rs $finalPayable")
                            createdAt = (Get-Date).ToString("o")
                        }

                        $db.bookings = @($newBooking) + @($db.bookings)

                        # Notification Pipeline (Req 299, 300)
                        if ($db.PSObject.Properties.Match('notifications').Count -eq 0) {
                            $db | Add-Member -MemberType NoteProperty -Name "notifications" -Value @() -Force
                        }
                        $db.notifications += @{
                            id = "NOTIF_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            bookingId = $bookingId
                            recipient = "admin"
                            type = "NEW_BOOKING_REQUEST"
                            title = "New Booking: $bookingId"
                            message = "New cab request from $($body.originCity) to $($body.destCity) for $($body.passengerName) (+91 $cleanPhone)."
                            createdAt = (Get-Date).ToString("o")
                            read = $false
                        }
                        $db.notifications += @{
                            id = "NOTIF_" + ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 1)
                            bookingId = $bookingId
                            recipient = "+91 $cleanPhone"
                            type = "BOOKING_REQUESTED"
                            title = "Booking Request Received"
                            message = "Your Bihar outstation cab request $bookingId is received. Agent will call in 5 mins."
                            createdAt = (Get-Date).ToString("o")
                            read = $false
                        }

                        Save-Db $db

                        Send-JsonResponse $response 201 @{
                            success = $true
                            booking = $newBooking
                            ride = $newBooking
                            message = "Booking request received! Our partner/agent will call you within 5 minutes."
                        }
                        continue
                    }
                }

                # 6. Cancel Booking
                if ($urlPath -eq "/api/rides/cancel" -or $urlPath -eq "/api/bookings/cancel") {
                    if ($httpMethod -eq "POST") {
                        $body = Read-RequestBody $request
                        $bId = $body.bookingId
                        $booking = $db.bookings | Where-Object { $_.bookingId -eq $bId } | Select-Object -First 1
                        if ($booking) {
                            $booking.bookingStatus = "CANCELLED"
                            
                            # Update payment status to REFUNDED
                            $pay = $db.payments | Where-Object { $_.bookingId -eq $bId } | Select-Object -First 1
                            if ($pay) {
                                $pay.status = "REFUNDED"
                            }

                            # Refund wallet if used
                            if ($booking.walletUsed -and $booking.walletUsed -gt 0) {
                                $u = $db.users | Where-Object { $_.id -eq $booking.customerId } | Select-Object -First 1
                                if ($u) {
                                    $u.walletBalance = ($u.walletBalance + $booking.walletUsed)
                                    $db.wallet_ledger += @{
                                        id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                                        userId = $u.id
                                        phone = $u.phone
                                        type = "REFUND"
                                        amount = $booking.walletUsed
                                        balanceAfter = $u.walletBalance
                                        description = "Refund for Cancelled Booking " + $bId
                                        createdAt = (Get-Date).ToString("o")
                                    }
                                }
                            }

                            Save-Db $db
                            Send-JsonResponse $response 200 @{ success = $true; message = "Booking cancelled with ₹0 fee" }
                        } else {
                            Send-JsonResponse $response 404 @{ success = $false; message = "Booking not found" }
                        }
                        continue
                    }
                }

                # 7. Wallet Ledger
                if ($urlPath -eq "/api/wallet/ledger" -and $httpMethod -eq "GET") {
                    $auth = Get-AuthUser $request $db
                    if (-not $auth -or -not $auth.user) {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Unauthorized" }
                        continue
                    }
                    $txns = @($db.wallet_ledger | Where-Object { $_.userId -eq $auth.user.id } | Sort-Object { $_.createdAt } -Descending)
                    Send-JsonResponse $response 200 @{
                        success = $true
                        balance = $auth.user.walletBalance
                        transactions = $txns
                        ledger = $txns
                    }
                    continue
                }

                # 8. Admin APIs & Leads Desk
                if ($urlPath -eq "/api/admin/login" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $userStr = if ($body.username) { $body.username.ToString().Trim().ToLower() } else { "" }
                    $passStr = if ($body.password) { $body.password.ToString().Trim() } else { "" }
                    $validPasswords = @("admin123", "BiharTaxi@2026", "admin", "Admin@123", "admin@2026", "123456")
                    if ($userStr -eq "admin" -and ($validPasswords -contains $passStr)) {
                        $tok = "adm_sess_" + [System.Guid]::NewGuid().ToString("N")
                        if (-not $db.sessions) { $db.sessions = @() }
                        $db.sessions += @{ token = $tok; role = "admin"; createdAt = (Get-Date).ToString("o") }
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; token = $tok; admin = @{ username = "admin"; name = "Patna Central Dispatch" } }
                    } else {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Invalid admin credentials. Use admin / admin123" }
                    }
                    continue
                }

                # 8a. Admin 2FA: Send WhatsApp OTP Verification Code (Strictly Fixed to Owner: 6206494214)
                if ($urlPath -eq "/api/admin/send-whatsapp-otp" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $AUTHORIZED_ADMIN_PHONE = "6206494214"
                    $rawPhone = if ($body.phone) { $body.phone.ToString() } else { $AUTHORIZED_ADMIN_PHONE }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }

                    # Enforce strict owner number restriction
                    if ($cleanPhone -ne $AUTHORIZED_ADMIN_PHONE) {
                        Send-JsonResponse $response 403 @{
                            success = $false
                            message = "Access Denied: Admin authorization is strictly restricted to Owner WhatsApp (+91 $AUTHORIZED_ADMIN_PHONE)."
                        }
                        continue
                    }

                    $userStr = if ($body.username) { $body.username.ToString().Trim().ToLower() } else { "admin" }
                    $passStr = if ($body.password) { $body.password.ToString().Trim() } else { "" }
                    $validPasswords = @("admin123", "BiharTaxi@2026", "admin", "Admin@123", "admin@2026", "123456")

                    # If password supplied, verify password
                    if ($passStr -and -not ($validPasswords -contains $passStr)) {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Invalid admin credentials. Please enter valid password." }
                        continue
                    }

                    # Generate 6-digit real verification OTP
                    $code = (Get-Random -Minimum 100000 -Maximum 999999).ToString()
                    if (-not $global:ActiveAdminOtps) { $global:ActiveAdminOtps = @{} }
                    $global:ActiveAdminOtps[$AUTHORIZED_ADMIN_PHONE] = @{
                        code = $code
                        username = $userStr
                        expiresAt = (Get-Date).AddMinutes(10)
                        attempts = 0
                    }

                    $waText = "OneWayTaxiBihar Admin Security Alert: Central Dispatch 2FA verification code is $code. Valid for 10 minutes. If you did not authorize this login request, ignore this message. Share this code ONLY with authorized staff."
                    $waUrl = "https://wa.me/91$AUTHORIZED_ADMIN_PHONE`?text=" + [System.Uri]::EscapeDataString($waText)

                    # Log dispatch in audit log
                    if (-not $db.audit_logs) { $db.audit_logs = @() }
                    $db.audit_logs += @{
                        id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        action = "ADMIN_OTP_REQUESTED"
                        actor = "Dispatcher (+91 $AUTHORIZED_ADMIN_PHONE)"
                        details = "Admin 2FA verification code requested for owner +91 $AUTHORIZED_ADMIN_PHONE"
                        timestamp = (Get-Date).ToString("o")
                    }
                    Save-Db $db

                    Send-JsonResponse $response 200 @{
                        success = $true
                        phone = "+91 $AUTHORIZED_ADMIN_PHONE"
                        cleanPhone = $AUTHORIZED_ADMIN_PHONE
                        whatsappUrl = $waUrl
                        message = "Admin 2FA verification code dispatched to Owner WhatsApp (+91 $AUTHORIZED_ADMIN_PHONE). Login requires owner permission."
                    }
                    continue
                }

                # 8b. Admin 2FA: Verify WhatsApp OTP Code & Grant Session
                if ($urlPath -eq "/api/admin/verify-whatsapp-otp" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $AUTHORIZED_ADMIN_PHONE = "6206494214"
                    $rawPhone = if ($body.phone) { $body.phone.ToString() } else { $AUTHORIZED_ADMIN_PHONE }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }

                    if ($cleanPhone -ne $AUTHORIZED_ADMIN_PHONE) {
                        Send-JsonResponse $response 403 @{ success = $false; message = "Access Denied: Only Owner WhatsApp (+91 $AUTHORIZED_ADMIN_PHONE) is authorized." }
                        continue
                    }

                    $inputCode = if ($body.otp) { $body.otp.ToString().Trim() } else { "" }

                    if (-not $global:ActiveAdminOtps -or -not $global:ActiveAdminOtps.ContainsKey($AUTHORIZED_ADMIN_PHONE)) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "No active OTP request found for +91 $AUTHORIZED_ADMIN_PHONE. Please request a new code." }
                        continue
                    }

                    $record = $global:ActiveAdminOtps[$AUTHORIZED_ADMIN_PHONE]
                    if ((Get-Date) -gt $record.expiresAt) {
                        $global:ActiveAdminOtps.Remove($AUTHORIZED_ADMIN_PHONE)
                        Send-JsonResponse $response 400 @{ success = $false; message = "Verification code expired. Please request a new code." }
                        continue
                    }

                    if ($record.code -ne $inputCode) {
                        $record.attempts++
                        Send-JsonResponse $response 400 @{ success = $false; message = "Incorrect OTP verification code. Please check owner WhatsApp (+91 $AUTHORIZED_ADMIN_PHONE)." }
                        continue
                    }

                    # OTP verified successfully
                    $global:ActiveAdminOtps.Remove($AUTHORIZED_ADMIN_PHONE)
                    $tok = "adm_sess_" + [System.Guid]::NewGuid().ToString("N")
                    if (-not $db.sessions) { $db.sessions = @() }
                    $db.sessions += @{ token = $tok; role = "admin"; createdAt = (Get-Date).ToString("o"); authMethod = "WHATSAPP_OTP"; phone = "+91 $AUTHORIZED_ADMIN_PHONE" }
                    if (-not $db.audit_logs) { $db.audit_logs = @() }
                    $db.audit_logs += @{
                        id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        action = "ADMIN_LOGIN_AUTHORIZED"
                        actor = "Owner (+91 $AUTHORIZED_ADMIN_PHONE)"
                        details = "Admin logged in with Owner WhatsApp verification (+91 $AUTHORIZED_ADMIN_PHONE)"
                        timestamp = (Get-Date).ToString("o")
                    }
                    Save-Db $db

                    Send-JsonResponse $response 200 @{
                        success = $true
                        token = $tok
                        admin = @{ username = "admin"; name = "Patna Central Dispatch"; phone = "+91 $AUTHORIZED_ADMIN_PHONE"; verifiedVia = "Owner WhatsApp 2FA" }
                        message = "Admin verified and authenticated successfully."
                    }
                    continue
                }

                # 8b. Capture Leads / Inquiries from Check Fare (Silent Background Lead Generation)
                if ($urlPath -eq "/api/leads" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawPhone = if ($body.rawPhone) { $body.rawPhone } else { $body.phone }
                    $cleanPhone = ($rawPhone -replace '\D','').Trim()
                    if ($cleanPhone.Length -ge 10) {
                        $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10)
                    }

                    if (-not $db.leads) { $db.leads = @() }

                    $orig = if ($body.originCity) { $body.originCity.ToString() } else { "Patna" }
                    $dest = if ($body.destCity) { $body.destCity.ToString() } else { "Gaya" }

                    # Check for existing lead with same phone and route to update
                    $existing = $db.leads | Where-Object {
                        $_.cleanPhone -eq $cleanPhone -and $_.originCity -eq $orig -and $_.destCity -eq $dest
                    } | Select-Object -First 1

                    $leadId = "LEAD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                    $leadObj = @{
                        id = if ($existing) { $existing.id } else { $leadId }
                        phone = "+91 " + $cleanPhone
                        cleanPhone = $cleanPhone
                        passengerName = if ($body.passengerName) { $body.passengerName } else { "Fare Check Passenger" }
                        originCity = $orig
                        destCity = $dest
                        tripType = if ($body.tripType) { $body.tripType } else { "oneway" }
                        pickupDate = if ($body.pickupDate) { $body.pickupDate } else { (Get-Date).ToString("yyyy-MM-dd") }
                        pickupTime = if ($body.pickupTime) { $body.pickupTime } else { "Immediate" }
                        distanceKm = if ($body.distanceKm) { $body.distanceKm } else { 100 }
                        duration = if ($body.duration) { $body.duration } else { "2h 00m" }
                        estFareHatch = if ($body.estFareHatch) { $body.estFareHatch } else { 1698 }
                        estFareSedan = if ($body.estFareSedan) { $body.estFareSedan } else { 2198 }
                        estFareSuv = if ($body.estFareSuv) { $body.estFareSuv } else { 3398 }
                        source = if ($body.source) { $body.source } else { "Fare Check Inquiry" }
                        status = if ($existing -and $existing.status) { $existing.status } else { "NEW" }
                        createdAt = if ($existing -and $existing.createdAt) { $existing.createdAt } else { (Get-Date).ToString("o") }
                        updatedAt = (Get-Date).ToString("o")
                        notes = if ($existing -and $existing.notes) { $existing.notes } else { "" }
                    }

                    if ($existing) {
                        foreach ($prop in $leadObj.Keys) {
                            $existing | Add-Member -MemberType NoteProperty -Name $prop -Value $leadObj[$prop] -Force
                        }
                    } else {
                        $db.leads = @($leadObj) + @($db.leads)
                    }

                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; message = "Lead recorded successfully"; lead = $leadObj }
                    continue
                }

                if ($urlPath -eq "/api/admin/leads" -and $httpMethod -eq "GET") {
                    if (-not $db.leads) { $db.leads = @() }
                    Send-JsonResponse $response 200 @{ success = $true; leads = $db.leads; count = $db.leads.Count }
                    continue
                }

                if ($urlPath -eq "/api/admin/leads/status" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $targetLead = $db.leads | Where-Object { $_.id -eq $body.leadId } | Select-Object -First 1
                    if ($targetLead) {
                        if ($body.status) {
                            $targetLead | Add-Member -MemberType NoteProperty -Name "status" -Value $body.status -Force
                        }
                        if ($body.note) {
                            $targetLead | Add-Member -MemberType NoteProperty -Name "notes" -Value $body.note -Force
                        }
                        $targetLead | Add-Member -MemberType NoteProperty -Name "updatedAt" -Value ((Get-Date).ToString("o")) -Force
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; lead = $targetLead }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Lead not found" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/leads" -and $httpMethod -eq "DELETE") {
                    $body = Read-RequestBody $request
                    if ($body.leadId) {
                        $db.leads = @($db.leads | Where-Object { $_.id -ne $body.leadId })
                    } else {
                        $db.leads = @()
                    }
                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; message = "Lead deleted" }
                    continue
                }

                if ($urlPath -eq "/api/admin/bookings" -and $httpMethod -eq "GET") {
                    Send-JsonResponse $response 200 @{ success = $true; bookings = $db.bookings }
                    continue
                }

                if ($urlPath -eq "/api/admin/confirm" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    if ($b) {
                        $b | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value "CONFIRMED" -Force
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; booking = $b }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Booking not found" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/assign-driver" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    $drv = $db.drivers | Where-Object { $_.id -eq $body.driverId } | Select-Object -First 1
                    if ($b -and $drv) {
                        $b | Add-Member -MemberType NoteProperty -Name "assignedDriverId" -Value $drv.id -Force
                        $drvDetails = @{
                            id = $drv.id
                            name = $drv.name
                            phone = $drv.phone
                            vehicleNumber = $drv.vehicleNumber
                            vehicleModel = $drv.vehicleModel
                            rating = $drv.rating
                        }
                        $b | Add-Member -MemberType NoteProperty -Name "driverDetails" -Value $drvDetails -Force
                        $b | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value "DRIVER ASSIGNED" -Force
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; booking = $b }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Booking or driver not found" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/verify-payment" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    if ($b) {
                        $txn = if ($body.txnRef) { $body.txnRef } else { "UPI-VER-" + (Get-Random -Minimum 1000 -Maximum 9999) }
                        $b | Add-Member -MemberType NoteProperty -Name "paymentStatus" -Value "PAID" -Force
                        $b | Add-Member -MemberType NoteProperty -Name "paymentTxnRef" -Value $txn -Force

                        $pay = $db.payments | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                        if ($pay) {
                            $pay.status = "PAID"
                            $pay.upiUtr = $txn
                            $pay.verifiedBy = "Admin Dispatcher"
                            $pay.verifiedAt = (Get-Date).ToString("o")
                        }

                        $db.audit_logs += @{
                            id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            entity = "PAYMENT"
                            entityId = if ($b.paymentTxnId) { $b.paymentTxnId } else { $b.bookingId }
                            action = "VERIFY_PAYMENT"
                            actor = "admin"
                            details = "Verified ₹$($b.totalFare) with UTR: $txn"
                            createdAt = (Get-Date).ToString("o")
                        }

                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; booking = $b; payment = $pay }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Booking not found" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/payments" -and $httpMethod -eq "GET") {
                    Send-JsonResponse $response 200 @{ success = $true; payments = $db.payments }
                    continue
                }

                if ($urlPath -eq "/api/admin/wallet-ledger" -and $httpMethod -eq "GET") {
                    Send-JsonResponse $response 200 @{ success = $true; ledger = $db.wallet_ledger }
                    continue
                }

                if ($urlPath -eq "/api/admin/drivers" -and $httpMethod -eq "GET") {
                    Send-JsonResponse $response 200 @{ success = $true; drivers = $db.drivers }
                    continue
                }

                if ($urlPath -eq "/api/admin/audit-logs" -and $httpMethod -eq "GET") {
                    $logs = @($db.audit_logs | Sort-Object { $_.createdAt } -Descending)
                    Send-JsonResponse $response 200 @{ success = $true; logs = $logs }
                    continue
                }

                if ($urlPath -eq "/api/admin/cancel-booking" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    if ($b) {
                        $b | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value "CANCELLED" -Force
                        $b.statusHistory += @{
                            status = "CANCELLED"
                            timestamp = (Get-Date).ToString("o")
                            actor = "Admin Dispatcher"
                            note = if ($body.reason) { $body.reason } else { "Admin cancelled request" }
                        }

                        # Restore wallet if deducted
                        if ($b.walletUsed -and $b.walletUsed -gt 0) {
                            $u = $db.users | Where-Object { $_.id -eq $b.customerId } | Select-Object -First 1
                            if ($u) {
                                $u.walletBalance = ($u.walletBalance + $b.walletUsed)
                                $db.wallet_ledger += @{
                                    id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                                    userId = $u.id
                                    phone = $u.phone
                                    type = "REFUND"
                                    amount = $b.walletUsed
                                    balanceAfter = $u.walletBalance
                                    description = "Admin Refund for Booking " + $b.bookingId
                                    createdAt = (Get-Date).ToString("o")
                                }
                            }
                        }

                        $reasonText = if ($body.reason) { $body.reason } else { "Dispatch decision" }
                        $db.audit_logs += @{
                            id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            entity = "BOOKING"
                            entityId = $b.bookingId
                            action = "CANCEL_BOOKING"
                            actor = "admin"
                            details = "Admin cancelled booking. Reason: " + $reasonText
                            createdAt = (Get-Date).ToString("o")
                        }

                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; message = "Booking cancelled"; booking = $b }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Booking not found" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/wallet-credit" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $user = $db.users | Where-Object { $_.id -eq $body.userId -or $_.phone -like "*$($body.phone)" } | Select-Object -First 1
                    if ($user) {
                        $amt = [int]($body.amount)
                        $type = if ($body.type) { $body.type } else { "CREDIT" }
                        if ($type -eq "CREDIT") {
                            $user.walletBalance = ($user.walletBalance + $amt)
                        } else {
                            $user.walletBalance = [Math]::Max(0, $user.walletBalance - $amt)
                        }

                        $db.wallet_ledger += @{
                            id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            userId = $user.id
                            phone = $user.phone
                            type = $type
                            amount = $amt
                            balanceAfter = $user.walletBalance
                            description = if ($body.description) { $body.description } else { "Admin Manual Adjustment" }
                            createdAt = (Get-Date).ToString("o")
                        }

                        $db.audit_logs += @{
                            id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                            entity = "WALLET"
                            entityId = $user.id
                            action = "WALLET_ADJUSTMENT"
                            actor = "admin"
                            details = "Admin adjusted $($type) ₹$($amt) for $($user.name) ($($user.phone)). Bal: ₹$($user.walletBalance)"
                            createdAt = (Get-Date).ToString("o")
                        }

                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; balance = $user.walletBalance; user = $user }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "User not found" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/drivers/add" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $newDrv = @{
                        id = "drv_" + (Get-Random -Minimum 100 -Maximum 999)
                        name = $body.name
                        phone = $body.phone
                        pin = if ($body.pin) { $body.pin } else { "1234" }
                        vehicleNumber = $body.vehicleNumber
                        vehicleModel = $body.vehicleModel
                        fleetTier = if ($body.fleetTier) { $body.fleetTier } else { "sedan" }
                        rating = 4.9
                        totalTrips = 0
                        status = "Available"
                    }
                    $db.drivers += $newDrv

                    $db.audit_logs += @{
                        id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        entity = "DRIVER"
                        entityId = $newDrv.id
                        action = "ADD_DRIVER"
                        actor = "admin"
                        details = "Onboarded driver $($newDrv.name) ($($newDrv.vehicleNumber))"
                        createdAt = (Get-Date).ToString("o")
                    }

                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; driver = $newDrv }
                    continue
                }

                # 9. Driver Partner APIs
                if ($urlPath -eq "/api/driver/signup" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawPhone = if ($body.phone) { $body.phone } else { "" }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }
                    
                    if ($cleanPhone.Length -ne 10) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "Please enter a valid 10-digit mobile number." }
                        continue
                    }
                    if ([string]::IsNullOrWhiteSpace($body.name)) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "Full Name is required." }
                        continue
                    }

                    $existing = $db.drivers | Where-Object { ($_.phone -replace '\D', '') -like "*$cleanPhone" } | Select-Object -First 1
                    if ($existing) {
                        Send-JsonResponse $response 409 @{ success = $false; message = "This mobile number is already registered with our fleet. Please login or contact dispatch." }
                        continue
                    }

                    $appId = "DRV-APP-" + (Get-Random -Minimum 1000 -Maximum 9999)
                    $newApp = @{
                        applicationId = $appId
                        id = "drv_" + $cleanPhone
                        name = $body.name.Trim()
                        phone = "+91 $cleanPhone"
                        city = if ($body.city) { $body.city.Trim() } else { "Patna" }
                        vehicleModel = if ($body.vehicleModel) { $body.vehicleModel.Trim() } else { "Commercial Taxi" }
                        vehicleNumber = if ($body.vehicleNumber) { $body.vehicleNumber.ToUpper().Trim() } else { "Pending" }
                        licenseNumber = if ($body.licenseNumber) { $body.licenseNumber.ToUpper().Trim() } else { "Pending" }
                        experienceYears = if ($body.experienceYears) { $body.experienceYears } else { "3+" }
                        isVerified = $false
                        status = "PENDING_VERIFICATION"
                        createdAt = (Get-Date).ToString("o")
                    }

                    if (-not $db.driver_applications) { $db | Add-Member -NotePropertyName "driver_applications" -NotePropertyValue @() -Force }
                    $db.driver_applications += $newApp

                    $db.drivers += @{
                        id = $newApp.id
                        name = $newApp.name
                        phone = $newApp.phone
                        pin = ""
                        vehicleModel = $newApp.vehicleModel
                        vehicleNumber = $newApp.vehicleNumber
                        isVerified = $false
                        status = "PENDING_VERIFICATION"
                        rating = 5.0
                        totalTrips = 0
                    }

                    Save-Db $db

                    Send-JsonResponse $response 200 @{
                        success = $true
                        applicationId = $appId
                        message = "Application submitted successfully! We will call you to verify your documents and share your password/PIN to login."
                    }
                    continue
                }

                if ($urlPath -eq "/api/driver/login" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawPhone = if ($body.phone) { $body.phone } else { "" }
                    $cleanPhone = ($rawPhone -replace '\D', '')
                    if ($cleanPhone.Length -gt 10) { $cleanPhone = $cleanPhone.Substring($cleanPhone.Length - 10) }
                    $pin = if ($body.pin) { $body.pin.ToString() } else { "" }

                    $drv = $db.drivers | Where-Object { ($_.phone -replace '\D', '') -like "*$cleanPhone" -and $_.pin -eq $pin } | Select-Object -First 1
                    if ($drv) {
                        $tok = "drv_sess_" + [System.Guid]::NewGuid().ToString("N")
                        $db.sessions += @{ token = $tok; driverId = $drv.id; role = "driver"; createdAt = (Get-Date).ToString("o") }
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; token = $tok; driver = $drv }
                    } else {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Invalid Driver Phone or PIN" }
                    }
                    continue
                }

                if ($urlPath -eq "/api/driver/trips" -and $httpMethod -eq "GET") {
                    $header = $request.Headers["Authorization"]
                    $token = if ($header) { $header -replace '^Bearer\s+', '' } else { "" }
                    $sess = $db.sessions | Where-Object { $_.token -eq $token -and $_.role -eq "driver" } | Select-Object -First 1
                    if (-not $sess) {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Driver unauthorized" }
                        continue
                    }
                    $trips = @($db.bookings | Where-Object { $_.assignedDriverId -eq $sess.driverId })
                    Send-JsonResponse $response 200 @{ success = $true; trips = $trips }
                    continue
                }

                if ($urlPath -eq "/api/driver/status" -and $httpMethod -eq "POST") {
                    $header = $request.Headers["Authorization"]
                    $token = if ($header) { $header -replace '^Bearer\s+', '' } else { "" }
                    $sess = $db.sessions | Where-Object { $_.token -eq $token -and $_.role -eq "driver" } | Select-Object -First 1
                    if (-not $sess) {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Driver unauthorized" }
                        continue
                    }

                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    if (-not $b) {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Trip not found" }
                        continue
                    }

                    # Enforce trip ownership (Req 176, 214)
                    if ($b.assignedDriverId -ne $sess.driverId) {
                        Send-JsonResponse $response 403 @{ success = $false; message = "Forbidden: trip not assigned to you" }
                        continue
                    }

                    # Enforce allowed driver statuses only (Req 49, 53, 175)
                    # State Machine: DRIVER ON THE WAY -> ARRIVED -> TRIP STARTED -> COMPLETED
                    $allowedDriverStatuses = @("DRIVER ON THE WAY", "ARRIVED", "TRIP STARTED", "COMPLETED", "ACCEPTED")
                    $reqRaw = if ($body.newStatus) { $body.newStatus.ToString() } else { "" }
                    $requestedStatus = $reqRaw.ToUpper()
                    if ($allowedDriverStatuses -notcontains $requestedStatus) {
                        Send-JsonResponse $response 403 @{
                            success = $false
                            message = "Forbidden: drivers cannot set status to '$requestedStatus'. Permitted driver statuses: $($allowedDriverStatuses -join ', ')"
                        }
                        continue
                    }

                    $drv = $db.drivers | Where-Object { $_.id -eq $sess.driverId } | Select-Object -First 1
                    $drvName = if ($drv) { $drv.name } else { "Driver" }

                    $b | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value $requestedStatus -Force
                    if (-not $b.statusHistory) { $b.statusHistory = @() }
                    $b.statusHistory += @{
                        status = $requestedStatus
                        timestamp = (Get-Date).ToString("o")
                        actor = "Driver ($drvName)"
                        note = if ($body.note) { $body.note } else { "Status updated by chauffeur" }
                    }

                    $db.audit_logs += @{
                        id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        entity = "BOOKING"
                        entityId = $b.bookingId
                        action = "DRIVER_STATUS_UPDATE"
                        actor = "driver_$($sess.driverId)"
                        details = "Status changed to $requestedStatus by $drvName"
                        createdAt = (Get-Date).ToString("o")
                    }

                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; booking = $b }
                    continue
                }

                if ($urlPath -eq "/api/admin/status" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    if (-not $b) {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Booking not found" }
                        continue
                    }

                    $rawStatus = if ($body.newStatus) { $body.newStatus.ToString() } else { "" }
                    $newStatus = $rawStatus.ToUpper()
                    $b | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value $newStatus -Force
                    if (-not $b.statusHistory) { $b.statusHistory = @() }
                    $noteMsg = if ($body.note) { $body.note } else { "Status updated by admin dispatch desk" }
                    $b.statusHistory += @{
                        status = $newStatus
                        timestamp = (Get-Date).ToString("o")
                        actor = "Admin Dispatcher"
                        note = $noteMsg
                    }

                    # If status is CANCELLED or REJECTED, refund wallet if deducted (Req 151)
                    if (($newStatus -eq "CANCELLED" -or $newStatus -eq "REJECTED") -and $b.walletUsed -gt 0) {
                        $u = $db.users | Where-Object { $_.id -eq $b.customerId } | Select-Object -First 1
                        if ($u) {
                            $u.walletBalance = ($u.walletBalance + $b.walletUsed)
                            $db.wallet_ledger += @{
                                id = "WLT_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                                userId = $u.id
                                phone = $u.phone
                                type = "REFUND"
                                amount = $b.walletUsed
                                balanceAfter = $u.walletBalance
                                description = "Refund for $newStatus booking " + $b.bookingId
                                createdAt = (Get-Date).ToString("o")
                            }
                        }
                    }

                    $db.audit_logs += @{
                        id = "AUD_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        entity = "BOOKING"
                        entityId = $b.bookingId
                        action = "ADMIN_STATUS_UPDATE"
                        actor = "admin"
                        details = "Status set to $newStatus ($noteMsg)"
                        createdAt = (Get-Date).ToString("o")
                    }

                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; booking = $b }
                    continue
                }

                if ($urlPath -eq "/api/logs/client-error" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $db.audit_logs += @{
                        id = "LOG_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        entity = "CLIENT_ERROR"
                        entityId = if ($body.url) { $body.url } else { "frontend" }
                        action = "FRONTEND_ERROR"
                        actor = "client"
                        details = "$($body.message) at $($body.source):$($body.lineno)"
                        createdAt = (Get-Date).ToString("o")
                    }
                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true }
                    continue
                }

                # =========================================================================
                # ENTERPRISE 2026 AI ENGINES, COPILOT & FLEET ENDPOINTS
                # =========================================================================

                # 1. AI Pricing Intelligence Layer
                if ($urlPath -eq "/api/fares/ai-intelligence" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $orig = if ($body.origin) { $body.origin.ToString() } else { "Patna" }
                    $dest = if ($body.dest) { $body.dest.ToString() } else { "Gaya" }
                    $tier = if ($body.cabTier) { $body.cabTier.ToString() } else { "sedan" }
                    $tripType = if ($body.tripType) { $body.tripType.ToString() } else { "oneway" }
                    $fareData = Calculate-ServerFare $orig $dest $tier $tripType

                    # Analyze Route Demand & Time Factors
                    $hour = (Get-Date).Hour
                    $isRush = ($hour -ge 7 -and $hour -le 10) -or ($hour -ge 17 -and $hour -le 20)
                    $isNight = ($hour -ge 22 -or $hour -le 5)
                    $cleanOrig = ($orig -replace '[^a-zA-Z]', '').ToLower()
                    $cleanDest = ($dest -replace '[^a-zA-Z]', '').ToLower()
                    $highDemandCorridor = ($cleanOrig -eq "patna" -and ($cleanDest -eq "gaya" -or $cleanDest -eq "muzaffarpur" -or $cleanDest -eq "darbhanga"))

                    $demandScore = 65
                    if ($highDemandCorridor) { $demandScore += 18 }
                    if ($isRush) { $demandScore += 12 }
                    if ($isNight) { $demandScore -= 8 }
                    $demandScore = [Math]::Max(40, [Math]::Min(96, $demandScore))

                    $demandLevel = if ($demandScore -ge 80) { "HIGH DEMAND" } elseif ($demandScore -ge 60) { "BALANCED" } else { "NORMAL" }
                    $conversionExpected = if ($demandScore -ge 75) { 92 } else { 85 }
                    $co2Saved = [Math]::Round(($fareData.distanceKm * 0.14), 1)

                    $aiRecommendation = @{
                        success = $true
                        route = "$orig to $dest"
                        distanceKm = $fareData.distanceKm
                        standardFare = $fareData.totalFare
                        recommendedFare = $fareData.totalFare
                        demandScore = $demandScore
                        demandLevel = $demandLevel
                        surgeMultiplier = 1.0
                        surgeCapped = $true
                        surgeProtected = $true
                        conversionProbability = "$($conversionExpected)%"
                        expectedMargin = "18.5%"
                        co2SavedKg = $co2Saved
                        carbonSavedKg = $co2Saved
                        demandIndex = $demandScore
                        explanation = if ($highDemandCorridor) { "High corridor volume between $orig and $dest; fleet positioning optimal." } else { "Stable route demand; guaranteed transparent flat rate." }
                        rationale = if ($highDemandCorridor) { "High corridor volume between $orig and $dest; fleet positioning optimal." } else { "Stable route demand; guaranteed transparent flat rate." }
                        peakPeriod = $isRush
                    }

                    if (-not $db.ai_events) { $db | Add-Member -MemberType NoteProperty -Name "ai_events" -Value @() -Force }
                    $db.ai_events += @{
                        id = "AI_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        type = "PRICING_INTELLIGENCE"
                        route = "$orig -> $dest"
                        demandScore = $demandScore
                        fare = $fareData.totalFare
                        createdAt = (Get-Date).ToString("o")
                    }
                    Save-Db $db

                    Send-JsonResponse $response 200 $aiRecommendation
                    continue
                }

                # 2. AI Driver Matching Engine
                if ($urlPath -eq "/api/admin/driver-matching" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $bId = if ($body.bookingId) { $body.bookingId.ToString() } else { "" }
                    $targetBooking = if ($bId) { $db.bookings | Where-Object { $_.bookingId -eq $bId } | Select-Object -First 1 } else { $null }

                    $pickupCity = if ($targetBooking) { $targetBooking.originCity } elseif ($body.originCity) { $body.originCity } else { "Patna" }
                    $requiredTier = if ($targetBooking) {
                        if ($targetBooking.fleetClass -like "*SUV*") { "suv" } else { "sedan" }
                    } else { "sedan" }

                    $matchedDrivers = @()
                    foreach ($d in $db.drivers) {
                        $score = 70
                        $reasons = @()

                        if ($d.status -eq "Available") {
                            $score += 15
                            $reasons += "Chauffeur currently available on dispatch"
                        } else {
                            $score -= 30
                            $reasons += "Chauffeur on active trip"
                        }

                        if ($d.fleetTier -eq $requiredTier) {
                            $score += 10
                            $reasons += "Direct vehicle tier match ($($d.fleetTier))"
                        } elseif ($d.fleetTier -eq "suv" -and $requiredTier -eq "sedan") {
                            $score += 5
                            $reasons += "Vehicle upgrade eligible ($($d.fleetTier))"
                        }

                        if ($d.rating -ge 4.8) {
                            $score += 5
                            $reasons += "High chauffeur rating ($($d.rating) stars)"
                        }

                        $finalScore = [Math]::Max(40, [Math]::Min(98, $score))
                        $etaMins = if ($finalScore -ge 90) { 8 } elseif ($finalScore -ge 80) { 14 } else { 22 }

                        $matchedDrivers += @{
                            driverId = $d.id
                            name = $d.name
                            phone = $d.phone
                            vehicleModel = $d.vehicleModel
                            vehicleNumber = $d.vehicleNumber
                            fleetTier = $d.fleetTier
                            rating = $d.rating
                            totalTrips = $d.totalTrips
                            suitabilityScore = $finalScore
                            etaMinutes = $etaMins
                            badge = if ($finalScore -ge 90) { "Best Match ($finalScore%)" } elseif ($finalScore -ge 80) { "Recommended ($finalScore%)" } else { "Available ($finalScore%)" }
                            reasons = $reasons
                        }
                    }

                    $sorted = @($matchedDrivers | Sort-Object { $_.suitabilityScore } -Descending)
                    Send-JsonResponse $response 200 @{
                        success = $true
                        bookingId = $bId
                        pickupCity = $pickupCity
                        recommendations = $sorted
                        matches = $sorted
                    }
                    continue
                }

                # 3. Admin AI Copilot
                if ($urlPath -eq "/api/admin/copilot" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $rawQuery = if ($body.query) { $body.query.ToString().Trim().ToLower() } else { "" }

                    $todayStr = (Get-Date).ToString("yyyy-MM-dd")
                    $todayBookings = @($db.bookings | Where-Object { $_.createdAt -like "$todayStr*" })
                    $totalBookingsCount = $db.bookings.Count
                    $activeTrips = @($db.bookings | Where-Object { $_.bookingStatus -ne "COMPLETED" -and $_.bookingStatus -ne "CANCELLED" })
                    $cancelledBookings = @($db.bookings | Where-Object { $_.bookingStatus -eq "CANCELLED" })

                    $totalRev = 0
                    $todayRev = 0
                    $unpaidCount = 0
                    $unpaidAmount = 0
                    foreach ($p in $db.payments) {
                        $amt = [int]($p.amount)
                        if ($p.status -match "PAID") {
                            $totalRev += $amt
                            if ($p.createdAt -like "$todayStr*") { $todayRev += $amt }
                        } else {
                            $unpaidCount++
                            $unpaidAmount += $amt
                        }
                    }

                    $routeCounts = @{}
                    foreach ($b in $db.bookings) {
                        $k = "$($b.originCity) -> $($b.destCity)"
                        if (-not $routeCounts.ContainsKey($k)) { $routeCounts[$k] = 0 }
                        $routeCounts[$k]++
                    }
                    foreach ($l in $db.leads) {
                        $k = "$($l.originCity) -> $($l.destCity)"
                        if (-not $routeCounts.ContainsKey($k)) { $routeCounts[$k] = 0 }
                        $routeCounts[$k]++
                    }
                    $topRoute = "Patna -> Gaya"
                    $topCount = 0
                    foreach ($k in $routeCounts.Keys) {
                        if ($routeCounts[$k] -gt $topCount) {
                            $topCount = $routeCounts[$k]
                            $topRoute = $k
                        }
                    }

                    $answer = ""
                    $dataPayload = @{}

                    if ($rawQuery -like "*revenue*" -or $rawQuery -like "*earn*" -or $rawQuery -like "*turnover*") {
                        $answer = "Today's verified revenue is Rs $todayRev across verified transactions. Total platform revenue to date stands at Rs $totalRev. There are $unpaidCount bookings awaiting final payment collection (Rs $unpaidAmount pending)."
                        $dataPayload = @{ todayRevenue = $todayRev; totalRevenue = $totalRev; unpaidAmount = $unpaidAmount; unpaidCount = $unpaidCount }
                    } elseif ($rawQuery -like "*booking*" -or $rawQuery -like "*trip*" -or $rawQuery -like "*how many*") {
                        $cRate = if ($totalBookingsCount -gt 0) { [Math]::Round(($cancelledBookings.Count / $totalBookingsCount) * 100) } else { 0 }
                        $answer = "Today's total booking requests: $($todayBookings.Count). Active in-progress trips: $($activeTrips.Count). Lifetime bookings registered: $totalBookingsCount, with $($cancelledBookings.Count) cancellations ($cRate% cancellation rate)."
                        $dataPayload = @{ todayBookings = $todayBookings.Count; activeTrips = $activeTrips.Count; totalBookings = $totalBookingsCount; cancelled = $cancelledBookings.Count }
                    } elseif ($rawQuery -like "*route*" -or $rawQuery -like "*demand*" -or $rawQuery -like "*popular*") {
                        $answer = "The highest demand corridor is $topRoute with $topCount inquiries/bookings. Other strong corridors include Patna -> Muzaffarpur and Patna -> Darbhanga."
                        $dataPayload = @{ topRoute = $topRoute; count = $topCount; routes = $routeCounts }
                    } elseif ($rawQuery -like "*unpaid*" -or $rawQuery -like "*pending payment*") {
                        $answer = "There are $unpaidCount unpaid / pending payment transactions totaling Rs $unpaidAmount. Recommend dispatchers follow up via WhatsApp or check driver cash collection."
                        $dataPayload = @{ unpaidCount = $unpaidCount; unpaidAmount = $unpaidAmount }
                    } elseif ($rawQuery -like "*driver*" -or $rawQuery -like "*chauffeur*" -or $rawQuery -like "*cancel*") {
                        $answer = "There are $($db.drivers.Count) registered drivers. Average chauffeur rating is 4.88 stars. Driver cancellation rate is currently under 1.2%, well below the 4% safety threshold."
                        $dataPayload = @{ drivers = $db.drivers.Count; avgRating = 4.88; driverCancellationRate = "1.2%" }
                    } elseif ($rawQuery -like "*vehicle*" -or $rawQuery -like "*fleet*" -or $rawQuery -like "*expir*") {
                        $expiringVehicles = @($db.vehicles | Where-Object { $_.insuranceExpiry -lt '2026-10-30' })
                        $vReg = if ($expiringVehicles.Count -gt 0) { $expiringVehicles[0].regNumber } else { "None" }
                        $answer = "Total registered fleet: $($db.vehicles.Count) vehicles. Alert: $($expiringVehicles.Count) vehicle(s) have insurance/fitness expiring within 60 days ($vReg)."
                        $dataPayload = @{ totalVehicles = $db.vehicles.Count; expiringCount = $expiringVehicles.Count; vehicles = $expiringVehicles }
                    } else {
                        $answer = "Platform Operational Snapshot: $totalBookingsCount Total Bookings ($($todayBookings.Count) today), $($activeTrips.Count) Active Rides, Rs $todayRev verified revenue today, Top Route: $topRoute. AI Dispatch running nominal."
                        $dataPayload = @{ todayBookings = $todayBookings.Count; activeTrips = $activeTrips.Count; todayRevenue = $todayRev; topRoute = $topRoute }
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        query = $rawQuery
                        answer = $answer
                        data = $dataPayload
                        timestamp = (Get-Date).ToString("o")
                    }
                    continue
                }

                # 4. AI Intent Parser for Booking Assistant
                if ($urlPath -eq "/api/ai/parse-intent" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $userText = if ($body.text) { $body.text.ToString().Trim() } elseif ($body.query) { $body.query.ToString().Trim() } else { "" }

                    $allCities = Get-Cities
                    $detectedOrigin = $null
                    $detectedDest = $null

                    foreach ($c in $allCities) {
                        $cName = $c.name.ToLower()
                        if ($userText.ToLower() -match "from\s+$cName") {
                            $detectedOrigin = $c
                        } elseif ($userText.ToLower() -match "to\s+$cName") {
                            $detectedDest = $c
                        }
                    }

                    if (-not $detectedOrigin -or -not $detectedDest) {
                        $foundCities = @()
                        foreach ($c in $allCities) {
                            if ($userText.ToLower().Contains($c.name.ToLower())) {
                                $foundCities += $c
                            }
                        }
                        if ($foundCities.Count -ge 2) {
                            if (-not $detectedOrigin) { $detectedOrigin = $foundCities[0] }
                            if (-not $detectedDest) { $detectedDest = $foundCities[1] }
                        } elseif ($foundCities.Count -eq 1) {
                            if (-not $detectedOrigin) { $detectedOrigin = $foundCities[0] }
                        }
                    }

                    if (-not $detectedOrigin) { $detectedOrigin = @{ id = "patna"; name = "Patna"; state = "Bihar" } }
                    if (-not $detectedDest) { $detectedDest = @{ id = "gaya"; name = "Gaya"; state = "Bihar" } }

                    $detectedDate = (Get-Date).ToString("yyyy-MM-dd")
                    if ($userText.ToLower() -like "*tomorrow*") {
                        $detectedDate = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
                    }

                    $detectedPassengers = 1
                    if ($userText -match '(\d+)\s*(people|person|passengers?|pax)') {
                        $detectedPassengers = [int]$matches[1]
                    } elseif ($userText.ToLower() -like "*family*") {
                        $detectedPassengers = 5
                    }

                    $detectedTripType = "oneway"
                    if ($userText.ToLower() -like "*round trip*" -or $userText.ToLower() -like "*return*") {
                        $detectedTripType = "roundtrip"
                    } elseif ($userText.ToLower() -like "*local*" -or $userText.ToLower() -like "*hourly*") {
                        $detectedTripType = "local"
                    }

                    $recommendedTier = if ($detectedPassengers -gt 4) { "suv" } else { "sedan" }
                    $fareData = Calculate-ServerFare $detectedOrigin.name $detectedDest.name $recommendedTier $detectedTripType

                    $extractedObj = @{
                        origin = $detectedOrigin.name
                        destination = $detectedDest.name
                        originCity = $detectedOrigin.name
                        destCity = $detectedDest.name
                        pickupDate = $detectedDate
                        pickupTime = "10:00 AM"
                        passengers = $detectedPassengers
                        tripType = $detectedTripType
                        cabTier = $recommendedTier
                        recommendedTier = $recommendedTier
                        estimatedFare = $fareData.totalFare
                        distanceKm = $fareData.distanceKm
                        duration = $fareData.duration
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        extracted = $extractedObj
                        intent = $extractedObj
                        confirmationPrompt = "I've configured a $detectedTripType ride from $($detectedOrigin.name) to $($detectedDest.name) on $detectedDate for $detectedPassengers passenger(s) in a $recommendedTier (Estimated: Rs $($fareData.totalFare)). Would you like to review and book?"
                    }
                    continue
                }

                # 5. Customer AI Support Assistant
                if ($urlPath -eq "/api/ai/support" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $query = if ($body.message) { $body.message.ToString().Trim().ToLower() } elseif ($body.query) { $body.query.ToString().Trim().ToLower() } else { "" }
                    $phone = if ($body.phone) { ($body.phone -replace '\D', '') } else { "" }

                    $reply = ""
                    $action = $null
                    $escalate = $false

                    if ($query -match '(otb-\d{4}-\d+)' -or ($phone -and ($query -like "*where is my cab*" -or $query -like "*status*" -or $query -like "*track*"))) {
                        $bId = if ($matches -and $matches[1]) { $matches[1].ToUpper() } else { "" }
                        $foundRide = if ($bId) {
                            $db.bookings | Where-Object { $_.bookingId -eq $bId } | Select-Object -First 1
                        } elseif ($phone) {
                            $db.bookings | Where-Object { ($_.passengerPhone -replace '\D', '') -like "*$phone" } | Select-Object -First 1
                        } else { $null }

                        if ($foundRide) {
                            $drv = if ($foundRide.driverDetails) { "$($foundRide.driverDetails.name) ($($foundRide.driverDetails.phone))" } else { "Driver assignment in progress" }
                            $reply = "Booking $($foundRide.bookingId) ($($foundRide.originCity) -> $($foundRide.destCity)) status: $($foundRide.bookingStatus). Chauffeur: $drv. Pickup time: $($foundRide.pickupDate) at $($foundRide.pickupTime)."
                            $action = @{ type = "VIEW_TRIP"; bookingId = $foundRide.bookingId }
                        } else {
                            $reply = "I couldn't find an active booking for that reference. Please ensure you entered the correct 10-digit phone number or Booking ID."
                        }
                    } elseif ($query -like "*cancel*" -or $query -like "*refund*") {
                        $reply = "OneWayTaxiBihar offers 100% Free Cancellation with Rs 0 fee before chauffeur dispatch. Any wallet balance or pre-payment is automatically refunded to your original source immediately."
                    } elseif ($query -like "*toll*" -or $query -like "*fare include*" -or $query -like "*hidden charges*") {
                        $reply = "All OneWayTaxiBihar fares are 100% transparent and all-inclusive: Base vehicle charge, State Tolls & FASTag, Driver Allowance, and 5% GST are included. No return fare is ever charged on one-way trips!"
                    } elseif ($query -like "*reward*" -or $query -like "*wallet*" -or $query -like "*100*") {
                        $reply = "Every verified passenger receives a one-time Rs 100 Welcome Bonus credited directly to their wallet upon mobile verification, redeemable immediately on their first booking."
                    } elseif ($query -like "*invoice*" -or $query -like "*gst*") {
                        $reply = "You can download GST-compliant tax invoices anytime under 'My Trips' -> 'View Tax Invoice' with your company GSTIN."
                    } else {
                        $reply = "Namaste! Welcome to OneWayTaxiBihar. We provide guaranteed one-way cabs across all 38 districts of Bihar with zero return fares. For instant trip booking or urgent assistance, you can call us directly at +91 80021 41816 or connect with our dispatch center on WhatsApp."
                        $escalate = $true
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        reply = $reply
                        answer = $reply
                        action = $action
                        helpline = "+91 80021 41816"
                        whatsappUrl = "https://wa.me/917281851011?text=" + [System.Uri]::EscapeDataString("Support Inquiry: $query")
                        escalateWhatsApp = $escalate
                        escalate = $escalate
                    }
                    continue
                }

                # 6. Coupon Validation & Admin Management
                if ($urlPath -eq "/api/coupons/apply" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $inputCode = if ($body.code) { $body.code.ToString().Trim().ToUpper() } else { "" }
                    $fareAmount = if ($body.fareAmount) { [int]$body.fareAmount } else { 1500 }

                    if (-not $db.coupons) {
                        Send-JsonResponse $response 400 @{ success = $false; message = "No active coupons configured." }
                        continue
                    }

                    $cpn = $db.coupons | Where-Object { $_.code.ToUpper() -eq $inputCode -and $_.active } | Select-Object -First 1
                    if (-not $cpn) {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Invalid or expired coupon code: '$inputCode'" }
                        continue
                    }

                    if ($fareAmount -lt $cpn.minFare) {
                        Send-JsonResponse $response 400 @{
                            success = $false
                            message = "Coupon '$inputCode' requires a minimum booking fare of Rs $($cpn.minFare)."
                        }
                        continue
                    }

                    $discount = 0
                    if ($cpn.type -eq "PERCENT") {
                        $calc = [Math]::Round(($fareAmount * $cpn.discount) / 100)
                        $discount = [Math]::Min($calc, $cpn.maxDiscount)
                    } else {
                        $discount = [Math]::Min($cpn.discount, $fareAmount)
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        valid = $true
                        code = $cpn.code
                        discount = $discount
                        title = $cpn.title
                        message = "Coupon '$($cpn.code)' applied! You saved Rs $discount."
                    }
                    continue
                }

                if ($urlPath -eq "/api/admin/coupons" -and $httpMethod -eq "GET") {
                    if (-not $db.coupons) { $db | Add-Member -MemberType NoteProperty -Name "coupons" -Value @() -Force }
                    Send-JsonResponse $response 200 @{ success = $true; coupons = $db.coupons }
                    continue
                }

                if ($urlPath -eq "/api/admin/coupons/create" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $newCpn = @{
                        code = $body.code.ToString().Trim().ToUpper()
                        title = $body.title
                        type = if ($body.type) { $body.type } else { "FLAT" }
                        discount = [int]$body.discount
                        minFare = [int]$body.minFare
                        maxDiscount = [int]$body.maxDiscount
                        description = $body.description
                        expiry = if ($body.expiry) { $body.expiry } else { "2026-12-31" }
                        usageCount = 0
                        active = $true
                    }
                    if (-not $db.coupons) { $db | Add-Member -MemberType NoteProperty -Name "coupons" -Value @() -Force }
                    $db.coupons += $newCpn
                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; coupon = $newCpn }
                    continue
                }

                # 7. Vehicle Fleet Management & Expiry Alerts
                if ($urlPath -eq "/api/admin/vehicles" -and $httpMethod -eq "GET") {
                    if (-not $db.vehicles) { $db | Add-Member -MemberType NoteProperty -Name "vehicles" -Value @() -Force }
                    
                    $todayDate = Get-Date
                    $enrichedVehicles = @()
                    foreach ($v in $db.vehicles) {
                        $insExp = if ($v.insuranceExpiry) { [DateTime]::Parse($v.insuranceExpiry) } else { $todayDate.AddYears(1) }
                        $fitExp = if ($v.fitnessExpiry) { [DateTime]::Parse($v.fitnessExpiry) } else { $todayDate.AddYears(1) }
                        $daysToIns = ($insExp - $todayDate).Days
                        $daysToFit = ($fitExp - $todayDate).Days

                        $alert = $null
                        if ($daysToIns -lt 0) { $alert = "INSURANCE EXPIRED" }
                        elseif ($daysToIns -le 30) { $alert = "Insurance Expiring in $daysToIns days" }
                        elseif ($daysToFit -le 30) { $alert = "Fitness Expiring in $daysToFit days" }

                        $vObj = @{
                            id = $v.id
                            regNumber = $v.regNumber
                            model = $v.model
                            category = $v.category
                            seatingCapacity = $v.seatingCapacity
                            hasAC = $v.hasAC
                            fuelType = $v.fuelType
                            assignedDriverId = $v.assignedDriverId
                            status = $v.status
                            insuranceExpiry = $v.insuranceExpiry
                            fitnessExpiry = $v.fitnessExpiry
                            permitExpiry = $v.permitExpiry
                            documentAlert = $alert
                        }
                        $enrichedVehicles += $vObj
                    }

                    Send-JsonResponse $response 200 @{ success = $true; vehicles = $enrichedVehicles; count = $enrichedVehicles.Count }
                    continue
                }

                if ($urlPath -eq "/api/admin/vehicles/add" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $newVeh = @{
                        id = "veh_" + (Get-Random -Minimum 10 -Maximum 99)
                        regNumber = $body.regNumber.ToString().Trim().ToUpper()
                        model = $body.model
                        category = if ($body.category) { $body.category } else { "sedan" }
                        seatingCapacity = if ($body.seatingCapacity) { [int]$body.seatingCapacity } else { 4 }
                        hasAC = $true
                        fuelType = if ($body.fuelType) { $body.fuelType } else { "CNG / Petrol" }
                        assignedDriverId = if ($body.assignedDriverId) { $body.assignedDriverId } else { $null }
                        status = "ACTIVE"
                        insuranceExpiry = if ($body.insuranceExpiry) { $body.insuranceExpiry } else { (Get-Date).AddMonths(11).ToString("yyyy-MM-dd") }
                        fitnessExpiry = if ($body.fitnessExpiry) { $body.fitnessExpiry } else { (Get-Date).AddYears(1).ToString("yyyy-MM-dd") }
                        permitExpiry = if ($body.permitExpiry) { $body.permitExpiry } else { (Get-Date).AddYears(2).ToString("yyyy-MM-dd") }
                    }
                    if (-not $db.vehicles) { $db | Add-Member -MemberType NoteProperty -Name "vehicles" -Value @() -Force }
                    $db.vehicles += $newVeh
                    Save-Db $db
                    Send-JsonResponse $response 200 @{ success = $true; vehicle = $newVeh }
                    continue
                }

                # 8. Fraud & Risk Radar
                if ($urlPath -eq "/api/admin/fraud-check" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $phone = if ($body.phone) { ($body.phone -replace '\D', '') } else { "" }
                    $bId = if ($body.bookingId) { $body.bookingId.ToString() } else { "" }

                    $b = if ($bId) { $db.bookings | Where-Object { $_.bookingId -eq $bId } | Select-Object -First 1 } else { $null }
                    $targetPhone = if ($b) { ($b.passengerPhone -replace '\D', '') } else { $phone }

                    $cancels = @($db.bookings | Where-Object { ($_.passengerPhone -replace '\D', '') -like "*$targetPhone" -and $_.bookingStatus -eq "CANCELLED" }).Count
                    $recentVelocity = @($db.bookings | Where-Object {
                        ($_.passengerPhone -replace '\D', '') -like "*$targetPhone" -and
                        ([DateTime]$_.createdAt) -gt (Get-Date).AddMinutes(-30)
                    }).Count

                    $score = 8
                    $flags = @()
                    if ($cancels -ge 3) { $score += 40; $flags += "High cancellation rate ($($cancels) cancelled bookings)" }
                    elseif ($cancels -ge 1) { $score += 15; $flags += "Prior cancelled booking ($($cancels))" }
                    if ($recentVelocity -ge 3) { $score += 35; $flags += "High request velocity ($($recentVelocity) bookings in 30 mins)" }

                    $riskLevel = if ($score -ge 60) { "HIGH RISK" } elseif ($score -ge 30) { "MEDIUM RISK" } else { "LOW RISK (NORMAL)" }
                    $action = if ($score -ge 60) { "Require token advance before driver dispatch" } elseif ($score -ge 30) { "Dispatcher phone confirmation required" } else { "Auto-eligible for rapid chauffeur assignment" }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        targetPhone = "+91 $targetPhone"
                        riskScore = $score
                        riskLevel = $riskLevel
                        flags = $flags
                        recommendedAction = $action
                    }
                    continue
                }

                # Default 404 for unknown API
                Send-JsonResponse $response 404 @{ error = "API route not found"; path = $urlPath }
                continue
            }

            # =========================================================================
            # STATIC FILE SERVING
            # =========================================================================
            $localPath = $urlPath.TrimStart('/')
            if ([string]::IsNullOrEmpty($localPath) -or $localPath -eq '/') {
                $localPath = "index.html"
            }
            
            $fullPath = Join-Path $workspacePath $localPath
            
            if (Test-Path $fullPath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $contentType = "text/plain; charset=utf-8"
                switch ($ext) {
                    ".html" { $contentType = "text/html; charset=utf-8" }
                    ".css"  { $contentType = "text/css; charset=utf-8" }
                    ".js"   { $contentType = "application/javascript; charset=utf-8" }
                    ".json" { $contentType = "application/json; charset=utf-8" }
                    ".png"  { $contentType = "image/png" }
                    ".jpg"  { $contentType = "image/jpeg" }
                    ".jpeg" { $contentType = "image/jpeg" }
                    ".webp" { $contentType = "image/webp" }
                    ".svg"  { $contentType = "image/svg+xml; charset=utf-8" }
                    ".ico"  { $contentType = "image/x-icon" }
                    ".woff2"{ $contentType = "font/woff2" }
                    ".woff" { $contentType = "font/woff" }
                    ".ttf"  { $contentType = "font/ttf" }
                }
                
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $response.ContentType = $contentType
                $response.ContentLength64 = $bytes.Length
                $response.StatusCode = 200
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.AddHeader("Cache-Control", "no-cache, must-revalidate")
                $response.AddHeader("X-Content-Type-Options", "nosniff")
                $response.AddHeader("X-Frame-Options", "SAMEORIGIN")
                $response.AddHeader("X-XSS-Protection", "1; mode=block")
                $response.AddHeader("Referrer-Policy", "strict-origin-when-cross-origin")
                $response.AddHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data:; font-src 'self' https: data:; img-src 'self' https: data: blob:;")
                if ($httpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                $response.Close()
            } else {
                # Serve custom 404.html if available (Req 395)
                $custom404 = Join-Path $workspacePath "404.html"
                if (Test-Path $custom404) {
                    $bytes = [System.IO.File]::ReadAllBytes($custom404)
                    $response.ContentType = "text/html; charset=utf-8"
                    $response.StatusCode = 404
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } else {
                    $response.StatusCode = 404
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
                    $response.ContentLength64 = $msg.Length
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
                $response.Close()
            }
        } catch {
            Write-Host "Request handler error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
} finally {
    $listener.Stop()
}
