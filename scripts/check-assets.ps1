$htmlFiles = @('index.html', 'admin.html', 'driver.html', '404.html', '500.html')
$root = "c:\Users\himan\onewaycabs"
$missing = @()

foreach ($h in $htmlFiles) {
    $content = Get-Content (Join-Path $root $h) -Raw
    
    # Matches src="..." and href="..."
    $matches = [regex]::Matches($content, '(?:src|href)=["'']([^"'']+)["'']')
    foreach ($m in $matches) {
        $val = $m.Groups[1].Value
        # ignore external urls, anchors, javascript, tel, mailto
        if ($val -match '^(https?:|#|javascript:|tel:|mailto:|data:)' ) { continue }
        
        # strip query parameters
        $clean = ($val -replace '\?.*$', '')
        $localPath = Join-Path $root ($clean -replace '/', '\')
        if (-not (Test-Path $localPath)) {
            $missing += [PSCustomObject]@{
                File = $h
                Ref = $val
                ExpectedPath = $localPath
            }
        }
    }
}

if ($missing.Count -eq 0) {
    Write-Host "✅ ALL local assets (scripts, styles, images) exist! 0 broken references." -ForegroundColor Green
} else {
    Write-Host "❌ Found $($missing.Count) broken asset references:" -ForegroundColor Red
    $missing | Format-Table -AutoSize
}
