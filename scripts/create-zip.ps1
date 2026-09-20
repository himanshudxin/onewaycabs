$workspace = "c:\Users\himan\onewaycabs"
$zipPath = Join-Path $workspace "onewaytaxibihar-latest.zip"
$staging = Join-Path $workspace "scratch\zip_staging"

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging -Force | Out-Null

$exclude = @(
    '\\node_modules',
    '\\.git',
    'cloudflared\.exe',
    '\\.log$',
    '\\.zip$',
    'PREVIEW_URL\.txt',
    '\\.env$',
    'scratch',
    'data\\backups',
    '\\.user_uploaded'
)

$files = Get-ChildItem -Path $workspace -Recurse -File | Where-Object {
    $fPath = $_.FullName
    $skip = $false
    foreach ($pat in $exclude) {
        if ($fPath -match $pat) {
            $skip = $true
            break
        }
    }
    -not $skip
}

Write-Host "Staging $($files.Count) files..." -ForegroundColor Cyan

foreach ($f in $files) {
    $rel = $f.FullName.Substring($workspace.Length + 1)
    $dest = Join-Path $staging $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $f.FullName $dest -Force
}

Write-Host "Compressing archive to $zipPath..." -ForegroundColor Cyan
Compress-Archive -Path "$staging\*" -DestinationPath $zipPath -Force

# Clean up staging
Remove-Item $staging -Recurse -Force

$zipInfo = Get-Item $zipPath
$sizeMb = [Math]::Round(($zipInfo.Length / 1MB), 2)
Write-Host "`nSUCCESS: Created $zipPath ($sizeMb MB)" -ForegroundColor Green
Write-Host "Total files included: $($files.Count)" -ForegroundColor Gray
