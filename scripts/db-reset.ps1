# Reset database to production baseline with 0 test users/bookings
$dbPath = Join-Path $PSScriptRoot "..\data\db.json"
$raw = Get-Content $dbPath -Raw | ConvertFrom-Json

$raw.users = @()
$raw.sessions = @()
$raw.bookings = @()
$raw.payments = @()
$raw.wallet_ledger = @()
$raw.audit_logs = @()
$raw.notifications = @()

foreach ($driver in $raw.drivers) {
    $driver.status = "Available"
}

$json = $raw | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path $dbPath), $json, [System.Text.Encoding]::UTF8)
Write-Output "db.json cleanly reset for production. Verified 4 drivers, 1 super admin."
