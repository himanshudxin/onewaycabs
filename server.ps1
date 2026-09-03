# OneWayTaxiBihar (onewaytaxibihar.com) - REST API & Static Web Server
# OneWayTaxiBihar Mobility Pvt Ltd

$port = 8080
$workspacePath = "c:\Users\himan\onewaycabs"
$dbPath = Join-Path $workspacePath "data\db.json"

if (-not (Test-Path $dbPath)) {
    New-Item -ItemType Directory -Path (Join-Path $workspacePath "data") -Force | Out-Null
    Set-Content -Path $dbPath -Value '{"users":[],"rides":[],"captainsRadar":[]}' -Encoding UTF8
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
        return @{ users = @(); rides = @(); captainsRadar = @() }
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


try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            $httpMethod = $request.HttpMethod.ToUpper()
            $urlPath = $request.Url.LocalPath

            # Handle CORS Preflight
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
                        status = "OK"
                        name = "OneWayTaxiBihar REST API"
                        domain = "onewaytaxibihar.com"
                        company = "OneWayTaxiBihar Mobility Pvt Ltd"
                        helpline = "+91 94310 01122"
                        districtsServed = 38
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

                # 2. Auth: Send OTP
                if ($urlPath -eq "/api/auth/send-otp" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $phone = if ($body.phone) { $body.phone } else { "+91 94310 88219" }
                    $otp = "4829"
                    
                    Send-JsonResponse $response 200 @{
                        success = $true
                        message = "OTP sent successfully to $phone"
                        otp = $otp
                        expiresInSeconds = 300
                    }
                    continue
                }

                # 3. Auth: Verify OTP
                if ($urlPath -eq "/api/auth/verify-otp" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $phone = if ($body.phone) { $body.phone } else { "+91 6206494214" }
                    $user = $db.users | Where-Object { $_.phone -eq $phone } | Select-Object -First 1
                    if (-not $user) {
                        $user = @{
                            id = "usr_" + (Get-Random -Minimum 1000 -Maximum 9999)
                            name = if ($body.name) { $body.name } else { "Himanshu Shekhar" }
                            phone = $phone
                            email = "himanshu@onewaytaxibihar.com"
                            city = "Patna"
                            avatar = "👨‍💼"
                            memberSince = "2026"
                            totalTrips = 1
                            rating = 5.0
                            walletBalance = 100
                            welcomeBonusClaimed = $true
                            referralCode = "OTB-CAB-" + (Get-Random -Minimum 1000 -Maximum 9999)
                            referralsCount = 0
                            completedRefTrips = 0
                            referralEarnings = 0
                        }
                        $db.users += $user
                        Save-Db $db
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        token = "otb_auth_" + [System.Guid]::NewGuid().ToString("N")
                        user = $user
                        welcomeBonus = 100
                    }
                    continue
                }

                # 4. User Profile
                if ($urlPath -eq "/api/user/profile" -and $httpMethod -eq "GET") {
                    $user = $db.users | Select-Object -First 1
                    Send-JsonResponse $response 200 @{
                        success = $true
                        user = $user
                    }
                    continue
                }

                # 5. Rides: List All Rides
                if ($urlPath -eq "/api/rides" -and $httpMethod -eq "GET") {
                    Send-JsonResponse $response 200 @{
                        success = $true
                        count = $db.rides.Count
                        rides = $db.rides
                    }
                    continue
                }

                # 6. Rides: Create New Booking
                if ($urlPath -eq "/api/rides" -and $httpMethod -eq "POST") {
                    $newRide = Read-RequestBody $request
                    if ($newRide -is [System.Management.Automation.PSCustomObject]) {
                        if (-not $newRide.PSObject.Properties['bookingId']) {
                            $newRide | Add-Member -MemberType NoteProperty -Name "bookingId" -Value ("OTB-2026-" + (Get-Random -Minimum 1000 -Maximum 9999)) -Force
                        }
                        if (-not $newRide.PSObject.Properties['otpPin']) {
                            $newRide | Add-Member -MemberType NoteProperty -Name "otpPin" -Value ((Get-Random -Minimum 1000 -Maximum 9999).ToString()) -Force
                        }
                        if (-not $newRide.PSObject.Properties['createdAt']) {
                            $newRide | Add-Member -MemberType NoteProperty -Name "createdAt" -Value ((Get-Date).ToString("o")) -Force
                        }
                        if (-not $newRide.PSObject.Properties['bookingStatus']) {
                            $newRide | Add-Member -MemberType NoteProperty -Name "bookingStatus" -Value "Confirmed" -Force
                        }
                    }

                    # Prepend to DB
                    $updatedRides = @($newRide) + @($db.rides)
                    $db.rides = $updatedRides
                    Save-Db $db

                    Send-JsonResponse $response 201 @{
                        success = $true
                        message = "Ride booked successfully with OneWayTaxiBihar"
                        ride = $newRide
                    }
                    continue
                }

                # 7. Rides: Cancel Booking with Zero Fee
                if ($urlPath -eq "/api/rides/cancel" -and $httpMethod -eq "POST") {
                    $body = Read-RequestBody $request
                    $cancelId = $body.bookingId
                    foreach ($r in $db.rides) {
                        if ($r.bookingId -eq $cancelId) {
                            $r.bookingStatus = "Cancelled (Refunded)"
                        }
                    }
                    Save-Db $db
                    Send-JsonResponse $response 200 @{
                        success = $true
                        message = "Booking $cancelId cancelled with zero cancellation fee. 100% refunded."
                    }
                    continue
                }

                # 8. Leads / Fare Inquiries: Receive & Store Lead
                if ($urlPath -eq "/api/leads" -and $httpMethod -eq "POST") {
                    $newLead = Read-RequestBody $request
                    if ($newLead -is [System.Management.Automation.PSCustomObject]) {
                        if (-not $newLead.PSObject.Properties['leadId']) {
                            $newLead | Add-Member -MemberType NoteProperty -Name "leadId" -Value ("LEAD-" + (Get-Random -Minimum 1000 -Maximum 9999)) -Force
                        }
                        if (-not $newLead.PSObject.Properties['createdAt']) {
                            $newLead | Add-Member -MemberType NoteProperty -Name "createdAt" -Value ((Get-Date).ToString("o")) -Force
                        }
                    }
                    $leads = @()
                    if ($db.leads) {
                        $leads = @($db.leads)
                    }
                    $db.leads = @($newLead) + $leads
                    Save-Db $db

                    Send-JsonResponse $response 201 @{
                        success = $true
                        message = "Lead received and forwarded to Helpdesk (+91 80021 41816)"
                        lead = $newLead
                        helpdeskWhatsApp = "https://wa.me/917281851011"
                    }
                    continue
                }

                # 9. Leads: List Leads
                if ($urlPath -eq "/api/leads" -and $httpMethod -eq "GET") {
                    $leadsList = if ($db.leads) { $db.leads } else { @() }
                    Send-JsonResponse $response 200 @{
                        success = $true
                        count = $leadsList.Count
                        leads = $leadsList
                    }
                    continue
                }

                # 10. Locations: Recommendations for Pickup / Drop with Auto-Type Chips
                if ($urlPath -eq "/api/locations/recommendations" -and $httpMethod -eq "GET") {
                    $qParams = Get-QueryParams $request.Url
                    $cityId = if ($qParams.ContainsKey("city") -and $qParams["city"]) { $qParams["city"].ToLower() } else { "patna" }
                    $type = if ($qParams.ContainsKey("type") -and $qParams["type"]) { $qParams["type"].ToLower() } else { "pickup" }

                    $allLocs = Get-Locations
                    $cityLocs = @()
                    foreach ($l in $allLocs) {
                        if (($l.cityId -and $l.cityId.ToLower() -eq $cityId) -or ($l.cityName -and $l.cityName.ToLower().Contains($cityId))) {
                            $cityLocs += $l
                        }
                    }

                    if ($cityLocs.Count -eq 0) {
                        # Default fallback to popular Patna hubs
                        $cityLocs = @($allLocs | Where-Object { $_.popular -eq $true } | Select-Object -First 8)
                    }

                    # Extract quick auto-type chips
                    $quickChips = @()
                    foreach ($l in $cityLocs) {
                        $shortName = $l.name
                        if ($shortName -match '^(.*?)\s*\(') { $shortName = $matches[1] }
                        $quickChips += @{
                            id = $l.id
                            label = "$($l.icon) $shortName"
                            fullAddress = $l.address
                            category = $l.category
                        }
                        if ($quickChips.Count -ge 6) { break }
                    }

                    # Group by category
                    $categories = @{}
                    foreach ($l in $cityLocs) {
                        $cat = if ($l.category) { $l.category } else { "Major Landmarks" }
                        if (-not $categories.ContainsKey($cat)) {
                            $categories[$cat] = @()
                        }
                        $categories[$cat] += $l
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        city = $cityId
                        type = $type
                        total = $cityLocs.Count
                        quickChips = $quickChips
                        categories = $categories
                        locations = $cityLocs
                    }
                    continue
                }

                # 11. Locations: Search across POIs by query
                if ($urlPath -eq "/api/locations/search" -and $httpMethod -eq "GET") {
                    $qParams = Get-QueryParams $request.Url
                    $query = if ($qParams.ContainsKey("q") -and $qParams["q"]) { $qParams["q"].ToLower() } else { "" }
                    $cityFilter = if ($qParams.ContainsKey("city") -and $qParams["city"]) { $qParams["city"].ToLower() } else { "" }

                    $allLocs = Get-Locations
                    $results = @()

                    foreach ($l in $allLocs) {
                        $matchesCity = [string]::IsNullOrEmpty($cityFilter) -or ($l.cityId -and $l.cityId.ToLower() -eq $cityFilter) -or ($l.cityName -and $l.cityName.ToLower().Contains($cityFilter))
                        
                        if ($matchesCity) {
                            if ([string]::IsNullOrEmpty($query)) {
                                $results += $l
                            } else {
                                $tagMatch = $false
                                if ($l.tags) {
                                    foreach ($t in $l.tags) {
                                        if ($t.ToString().ToLower().Contains($query)) { $tagMatch = $true; break }
                                    }
                                }

                                if (($l.name -and $l.name.ToLower().Contains($query)) -or 
                                    ($l.address -and $l.address.ToLower().Contains($query)) -or 
                                    ($l.category -and $l.category.ToLower().Contains($query)) -or 
                                    ($l.hindiName -and $l.hindiName.Contains($query)) -or 
                                    $tagMatch) {
                                    $results += $l
                                }
                            }
                        }
                    }

                    Send-JsonResponse $response 200 @{
                        success = $true
                        query = $query
                        city = $cityFilter
                        count = $results.Count
                        results = @($results | Select-Object -First 15)
                    }
                    continue
                }

                # 12. Locations: Popular Pickups and Drops
                if ($urlPath -eq "/api/locations/popular" -and $httpMethod -eq "GET") {
                    $allLocs = Get-Locations
                    $popular = @($allLocs | Where-Object { $_.popular -eq $true })
                    Send-JsonResponse $response 200 @{
                        success = $true
                        count = $popular.Count
                        locations = $popular
                    }
                    continue
                }

                # Unknown API endpoint
                Send-JsonResponse $response 404 @{
                    error = "API route not found"
                    path = $urlPath
                }
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
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
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
