#!/usr/bin/env pwsh
# ============================================================
# OneWayTaxiBihar - One-Command Deploy Script
# Usage:  .\deploy.ps1 "your commit message"
# Effect: Commits all changes -> pushes to GitHub -> Vercel auto-deploys live
# ============================================================

param(
    [string]$Message = "chore: deploy changes $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
)

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  OneWayTaxiBihar - Deploying to Production    " -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $projectRoot

# 1. Stage all changes
Write-Host "[1/4] Staging all changes..." -ForegroundColor Yellow
git add -A

# Check if there is anything to commit
$status = git status --porcelain
if (-not $status) {
    Write-Host "  Nothing to commit - working tree clean." -ForegroundColor Green
} else {
    # 2. Commit
    Write-Host "[2/4] Committing: $Message" -ForegroundColor Yellow
    git commit -m $Message
    Write-Host "  Committed OK" -ForegroundColor Green
}

# 3. Push to GitHub
Write-Host "[3/4] Pushing to GitHub (origin/main)..." -ForegroundColor Yellow
git push origin main
Write-Host "  Pushed to GitHub OK" -ForegroundColor Green

# 4. Done - Vercel auto-deploys
Write-Host "[4/4] Vercel auto-deploy triggered!" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  DEPLOYED! Vercel is building your site now.  " -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Track at: https://vercel.com/dashboard        " -ForegroundColor Cyan
Write-Host ""
