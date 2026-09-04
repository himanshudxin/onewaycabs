# Database Restoration Script for OneWayTaxiBihar
param(
    [string]$DbFile = "..\data\db.json",
    [string]$BackupDir = "..\data\backups",
    [string]$SpecificFile = ""
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$dbFullPath = [System.IO.Path]::GetFullPath((Join-Path $scriptDir $DbFile))
$backupFullDir = [System.IO.Path]::GetFullPath((Join-Path $scriptDir $BackupDir))

if (-not (Test-Path $backupFullDir)) {
    Write-Error "Backup directory not found at: $backupFullDir"
    exit 1
}

$sourceFile = $null
if ($SpecificFile) {
    $sourceFile = Join-Path $backupFullDir $SpecificFile
    if (-not (Test-Path $sourceFile)) {
        Write-Error "Specified backup file not found: $sourceFile"
        exit 1
    }
} else {
    # Find latest backup
    $latest = Get-ChildItem -Path $backupFullDir -Filter "db_backup_*.json" | Sort-Object CreationTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "No backup files found in $backupFullDir"
        exit 1
    }
    $sourceFile = $latest.FullName
}

# Verify backup integrity before restoring
try {
    $content = [System.IO.File]::ReadAllText($sourceFile, [System.Text.Encoding]::UTF8)
    $parsed = $content | ConvertFrom-Json
} catch {
    Write-Error "Backup file is corrupted! Aborting restore: $($_.Exception.Message)"
    exit 1
}

# Restore
[System.IO.File]::Copy($sourceFile, $dbFullPath, $true)
Write-Host "Database successfully restored from: $sourceFile" -ForegroundColor Green
Write-Host "Restored collections: Users=$($parsed.users.Count), Bookings=$($parsed.bookings.Count), Drivers=$($parsed.drivers.Count)"
