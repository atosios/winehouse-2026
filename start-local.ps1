param(
    [switch]$NoBuild,
    [switch]$SkipComposer,
    [switch]$SkipMigrate,
    [switch]$SkipSeed,
    [switch]$SkipStorageLink,
    [switch]$SkipFrontendInstall,
    [switch]$FrontendInCurrentTerminal
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'winehouse-be'
$frontendPath = Join-Path $root 'winehouse-site'

if (-not (Test-Path $backendPath)) {
    throw "Backend folder not found: $backendPath"
}
if (-not (Test-Path $frontendPath)) {
    throw "Frontend folder not found: $frontendPath"
}

Write-Step 'Checking Docker availability'
$dockerReady = $false
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
    }
}
catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Write-Host "`n[!] Docker Desktop is not running or not responding." -ForegroundColor Yellow
    Write-Host "    To run the local backend and MySQL database, please open Docker Desktop." -ForegroundColor Yellow
    Write-Host "    Once Docker Desktop has started, re-run: .\start-local.ps1`n" -ForegroundColor Yellow
    
    $proceedFrontendOnly = Read-Host "Would you like to start the frontend anyway? (Y/N) [default: Y]"
    if ($proceedFrontendOnly -eq 'N' -or $proceedFrontendOnly -eq 'n') {
        exit 1
    }
}

if ($dockerReady) {
    Push-Location $backendPath
    try {
        if ($NoBuild) {
            Write-Step 'Starting backend stack (no rebuild)'
            docker compose up -d
        }
        else {
            Write-Step 'Starting backend stack (with build)'
            docker compose up -d --build
        }

    if (-not $SkipComposer) {
        Write-Step 'Installing backend PHP dependencies'
        docker compose exec -T app composer install
    }

    if (-not $SkipMigrate) {
        Write-Step 'Running database migrations'
        docker compose exec -T app php artisan migrate
    }

    if (-not $SkipSeed) {
        Write-Step 'Seeding database (creates admin if missing)'
        docker compose exec -T app php artisan db:seed
    }

        if (-not $SkipStorageLink) {
            Write-Step 'Creating storage symlink'
            docker compose exec -T app php artisan storage:link
        }
    }
    finally {
        Pop-Location
    }
}

Push-Location $frontendPath
try {
    if (-not $SkipFrontendInstall -and -not (Test-Path (Join-Path $frontendPath 'node_modules'))) {
        Write-Step 'Installing frontend dependencies'
        npm install
    }

    if ($FrontendInCurrentTerminal) {
        Write-Step 'Starting frontend dev server in current terminal'
        npm start
    }
    else {
        Write-Step 'Starting frontend dev server in a new PowerShell window'
        Start-Process pwsh -ArgumentList '-NoExit', '-Command', "Set-Location '$frontendPath'; npm start"
    }
}
finally {
    Pop-Location
}

Write-Host "`nStartup complete." -ForegroundColor Green
Write-Host 'Backend/API:   http://localhost:8080' -ForegroundColor Green
Write-Host 'Frontend:      http://localhost:4200' -ForegroundColor Green
Write-Host 'phpMyAdmin:    http://localhost:8081' -ForegroundColor Green
Write-Host 'Admin login:   http://localhost:4200/admin/login' -ForegroundColor Green
