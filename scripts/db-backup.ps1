# Automated Database Backup Script for OneWayTaxiBihar
param(
    [string]$DbFile = "..\data\db.json",
    [string]$BackupDir = "..\data\backups"
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbFullPath = [System.IO.Path]::GetFullPath((Join-Path $scriptDir $DbFile))
$backupFullDir = [System.IO.Path]::GetFullPath((Join-Path $scriptDir $BackupDir))

if (-not (Test-Path $backupFullDir)) {
    New-Item -ItemType Directory -Path $backupFullDir -Force | Out-Null
}

if (-not (Test-Path $dbFullPath)) {
    Write-Error "Source database file not found at: $dbFullPath"
    exit 1
}

# Verify JSON integrity before backup
try {
    $content = [System.IO.File]::ReadAllText($dbFullPath, [System.Text.Encoding]::UTF8)
    $parsed = $content | ConvertFrom-Json
} catch {
    Write-Error "Database JSON is corrupted! Cannot backup invalid JSON: $($_.Exception.Message)"
    exit 1
}

$timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$backupFileName = "db_backup_$timestamp.json"
$backupFilePath = Join-Path $backupFullDir $backupFileName

[System.IO.File]::Copy($dbFullPath, $backupFilePath, $true)

# Retention: Keep only the latest 30 backups
$allBackups = Get-ChildItem -Path $backupFullDir -Filter "db_backup_*.json" | Sort-Object CreationTime -Descending
if ($allBackups.Count -gt 30) {
    $toRemove = $allBackups | Select-Object -Skip 30
    foreach ($f in $toRemove) {
        Remove-Item -Path $f.FullName -Force
    }
}

Write-Host "Database successfully backed up to: $backupFilePath" -ForegroundColor Green
Write-Host "Collections verified: Users=$($parsed.users.Count), Bookings=$($parsed.bookings.Count), Drivers=$($parsed.drivers.Count), Payments=$($parsed.payments.Count)"
