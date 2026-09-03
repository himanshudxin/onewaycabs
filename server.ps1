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

                # 2. Auth: Direct Login (Name + Phone, Zero OTP)
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

                        $today = (Get-Date).ToString("yyyy-MM-dd")
                        if ($body.pickupDate -and $body.pickupDate -lt $today) {
                            Send-JsonResponse $response 400 @{ success = $false; message = "Pickup date cannot be in the past" }
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

                        $finalPayable = [Math]::Max(0, $baseTotal - $walletDeducted)
                        $bookingId = "OTB-2026-" + (Get-Random -Minimum 1000 -Maximum 9999)
                        $txnId = "TXN_" + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + "_" + (Get-Random -Minimum 1000 -Maximum 9999)

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
                            createdAt = (Get-Date).ToString("o")
                        }

                        $db.bookings = @($newBooking) + @($db.bookings)
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
                    }
                    continue
                }

                # 8. Admin APIs
                if ($urlPath -eq "/api/admin/login" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    if ($body.username -eq "admin" -and ($body.password -eq "admin123" -or $body.password -eq "BiharTaxi@2026")) {
                        $tok = "adm_sess_" + [System.Guid]::NewGuid().ToString("N")
                        $db.sessions += @{ token = $tok; role = "admin"; createdAt = (Get-Date).ToString("o") }
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; token = $tok; admin = @{ username = "admin"; name = "Patna Central Dispatch" } }
                    } else {
                        Send-JsonResponse $response 401 @{ success = $false; message = "Invalid admin credentials" }
                    }
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
                    $body = Read-RequestBody $request
                    $b = $db.bookings | Where-Object { $_.bookingId -eq $body.bookingId } | Select-Object -First 1
                    if ($b) {
                        $b | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value $body.newStatus -Force
                        Save-Db $db
                        Send-JsonResponse $response 200 @{ success = $true; booking = $b }
                    } else {
                        Send-JsonResponse $response 404 @{ success = $false; message = "Trip not found" }
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
                    ".svg"  { $contentType = "image/svg+xml" }
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
                if ($httpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
                $response.Close()
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $localPath")
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
                $response.Close()
            }
        } catch {
            Write-Host "Request handler error: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
} finally {
    $listener.Stop()
}
