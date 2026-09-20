$endpoints = @(
    @{ Path = '/favicon.svg' },
    @{ Path = '/' },
    @{ Path = '/admin.html' },
    @{ Path = '/driver.html' }
)

$taxiEmoji = [char]::ConvertFromUtf32(0x1F695)
$allPassed = $true

foreach ($ep in $endpoints) {
    $res = Invoke-WebRequest -Uri ('http://localhost:8080' + $ep.Path) -UseBasicParsing
    $content = $res.Content
    $hasChildishEmoji = $content.Contains($taxiEmoji)
    $hasChildishDashes = ($content -match 'stroke-dasharray')
    $hasAiSubtag = ($content -match 'AI MOBILITY')
    $hasProfessionalLogo = ($content.Contains('favicon.svg') -or $content.Contains('owtCarBody') -or $content.Contains('brand-logo-img'))

    $statusOk = ($res.StatusCode -eq 200 -and -not $hasChildishEmoji -and -not $hasChildishDashes -and -not $hasAiSubtag -and $hasProfessionalLogo)
    if (-not $statusOk) { $allPassed = $false }

    Write-Host "$($ep.Path) -> Status: $($res.StatusCode) | ChildishEmoji: $hasChildishEmoji | HasProfessionalLogo: $hasProfessionalLogo | ChildishDashes: $hasChildishDashes | HasAiSubtag: $hasAiSubtag"
}

if ($allPassed) {
    Write-Host "`nSUCCESS: All endpoints verified with professional vector emblem (0 childish emoji, 0 childish dashes, 0 AI subtags)." -ForegroundColor Green
} else {
    Write-Host "`nFAILURE: Some logo endpoints did not pass verification." -ForegroundColor Red
    exit 1
}
