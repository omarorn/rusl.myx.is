<#
.SYNOPSIS
    Sync quiz images between local sandbox and R2 bucket
.DESCRIPTION
    Pull: Download images from R2 to local folder
    Push: Upload local images to R2
    Sync: Clean up orphaned DB records after changes
.EXAMPLE
    .\sync-images.ps1 pull    # Download from R2
    .\sync-images.ps1 push    # Upload to R2 (deletes removed files)
    .\sync-images.ps1 sync    # Clean orphaned DB records
    .\sync-images.ps1 all     # Pull, then sync DB
#>

param(
    [Parameter(Position=0)]
    [ValidateSet('pull', 'push', 'sync', 'all', 'status')]
    [string]$Action = 'status'
)

$ErrorActionPreference = "Stop"

# Configuration
$R2Remote = "r2"  # rclone remote name
$Bucket = "trash-myx-images"
$LocalPath = "$PSScriptRoot\..\images-sandbox\quiz"
$ApiUrl = "https://trash.myx.is/api/admin"
$Password = "bobba"

# Ensure local folder exists
if (!(Test-Path $LocalPath)) {
    New-Item -ItemType Directory -Path $LocalPath -Force | Out-Null
}

function Test-Rclone {
    try {
        $null = rclone version
        return $true
    } catch {
        Write-Host "ERROR: rclone not installed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Install rclone:" -ForegroundColor Yellow
        Write-Host "  winget install Rclone.Rclone"
        Write-Host ""
        Write-Host "Then configure R2:" -ForegroundColor Yellow
        Write-Host "  rclone config"
        Write-Host "  - Name: r2"
        Write-Host "  - Type: s3"
        Write-Host "  - Provider: Cloudflare"
        Write-Host "  - Access Key: (from Cloudflare R2 API tokens)"
        Write-Host "  - Secret Key: (from Cloudflare R2 API tokens)"
        Write-Host "  - Endpoint: https://<account_id>.r2.cloudflarestorage.com"
        return $false
    }
}

function Invoke-Pull {
    Write-Host "Pulling images from R2..." -ForegroundColor Cyan
    rclone sync "${R2Remote}:${Bucket}/quiz" $LocalPath --progress
    $count = (Get-ChildItem $LocalPath -File).Count
    Write-Host "Downloaded $count images to $LocalPath" -ForegroundColor Green
}

function Invoke-Push {
    Write-Host "Pushing images to R2..." -ForegroundColor Cyan
    Write-Host "WARNING: This will delete files from R2 that don't exist locally!" -ForegroundColor Yellow
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne 'y') {
        Write-Host "Cancelled." -ForegroundColor Gray
        return
    }
    rclone sync $LocalPath "${R2Remote}:${Bucket}/quiz" --progress
    Write-Host "Push complete." -ForegroundColor Green
}

function Invoke-SyncDb {
    Write-Host "Checking for orphaned DB records..." -ForegroundColor Cyan

    $headers = @{
        "Authorization" = "Bearer $Password"
        "Content-Type" = "application/json"
    }

    # Get sync status
    $status = Invoke-RestMethod -Uri "$ApiUrl/sync" -Headers $headers -Method Get

    Write-Host ""
    Write-Host "Sync Status:" -ForegroundColor White
    Write-Host "  R2 files:        $($status.stats.r2_total)" -ForegroundColor Gray
    Write-Host "  DB records:      $($status.stats.db_total)" -ForegroundColor Gray
    Write-Host "  Orphaned in DB:  $($status.stats.orphaned_in_db)" -ForegroundColor $(if ($status.stats.orphaned_in_db -gt 0) { "Yellow" } else { "Green" })
    Write-Host "  Orphaned in R2:  $($status.stats.orphaned_in_r2)" -ForegroundColor $(if ($status.stats.orphaned_in_r2 -gt 0) { "Yellow" } else { "Green" })

    if ($status.stats.orphaned_in_db -gt 0) {
        Write-Host ""
        Write-Host "Orphaned DB records (images deleted from R2):" -ForegroundColor Yellow
        foreach ($img in $status.orphanedInDb) {
            Write-Host "  - $($img.item) ($($img.bin))" -ForegroundColor Gray
        }

        $confirm = Read-Host "Clean up these $($status.stats.orphaned_in_db) orphaned DB records? (y/N)"
        if ($confirm -eq 'y') {
            $body = @{ cleanDb = $true } | ConvertTo-Json
            $result = Invoke-RestMethod -Uri "$ApiUrl/sync/cleanup" -Headers $headers -Method Post -Body $body
            Write-Host $result.message -ForegroundColor Green
        }
    }

    if ($status.stats.orphaned_in_r2 -gt 0) {
        Write-Host ""
        Write-Host "Orphaned R2 files (no DB record):" -ForegroundColor Yellow
        foreach ($key in $status.orphanedInR2) {
            Write-Host "  - $key" -ForegroundColor Gray
        }

        $confirm = Read-Host "Delete these $($status.stats.orphaned_in_r2) orphaned R2 files? (y/N)"
        if ($confirm -eq 'y') {
            $body = @{ cleanR2 = $true } | ConvertTo-Json
            $result = Invoke-RestMethod -Uri "$ApiUrl/sync/cleanup" -Headers $headers -Method Post -Body $body
            Write-Host $result.message -ForegroundColor Green
        }
    }

    if ($status.stats.orphaned_in_db -eq 0 -and $status.stats.orphaned_in_r2 -eq 0) {
        Write-Host ""
        Write-Host "Everything is in sync!" -ForegroundColor Green
    }
}

function Get-Status {
    Write-Host "Checking status..." -ForegroundColor Cyan

    # Local count
    $localCount = (Get-ChildItem $LocalPath -File -ErrorAction SilentlyContinue).Count
    Write-Host "Local images: $localCount" -ForegroundColor Gray

    # API sync status
    try {
        $headers = @{ "Authorization" = "Bearer $Password" }
        $status = Invoke-RestMethod -Uri "$ApiUrl/sync" -Headers $headers -Method Get
        Write-Host "R2 images:    $($status.stats.r2_total)" -ForegroundColor Gray
        Write-Host "DB records:   $($status.stats.db_total)" -ForegroundColor Gray

        if ($status.stats.orphaned_in_db -gt 0 -or $status.stats.orphaned_in_r2 -gt 0) {
            Write-Host ""
            Write-Host "Out of sync! Run: .\sync-images.ps1 sync" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Could not reach API" -ForegroundColor Red
    }
}

# Main
if (!(Test-Rclone) -and $Action -ne 'sync' -and $Action -ne 'status') {
    exit 1
}

switch ($Action) {
    'pull'   { Invoke-Pull }
    'push'   { Invoke-Push }
    'sync'   { Invoke-SyncDb }
    'all'    { Invoke-Pull; Invoke-SyncDb }
    'status' { Get-Status }
}
