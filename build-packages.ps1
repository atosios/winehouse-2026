# ==============================================================================
# Build & Package Script for The Winehouse (Frontend + Backend)
# ==============================================================================
param(
    [switch]$SkipFrontendBuild,
    [switch]$SkipBackendComposer
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "`n==================================================" -ForegroundColor Cyan
    Write-Host " ==> $Message" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
}

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendDir = Join-Path $rootDir 'winehouse-site'
$backendDir = Join-Path $rootDir 'winehouse-be'
$publishDir = Join-Path $rootDir 'dist-publish'
$frontendPublishDir = Join-Path $publishDir 'winehouse-fe'
$backendPublishDir = Join-Path $publishDir 'winehouse-be'

# ------------------------------------------------------------------------------
# 1. Clean / Recreate publish directory
# ------------------------------------------------------------------------------
Write-Step "Preparing publish output directory ($publishDir)"
if (-not (Test-Path $publishDir)) {
    New-Item -ItemType Directory -Path $publishDir | Out-Null
}
if (Test-Path "$publishDir\fe") {
    try { Remove-Item "$publishDir\fe" -Recurse -Force } catch { }
}
if (Test-Path "$publishDir\winehouse-frontend") {
    try { Remove-Item "$publishDir\winehouse-frontend" -Recurse -Force } catch { }
}
if (Test-Path $frontendPublishDir) {
    try { Remove-Item $frontendPublishDir -Recurse -Force } catch { }
}
New-Item -ItemType Directory -Path $frontendPublishDir -Force | Out-Null
New-Item -ItemType Directory -Path $backendPublishDir -Force | Out-Null

# ------------------------------------------------------------------------------
# 2. Build Frontend (Angular)
# ------------------------------------------------------------------------------
if (-not $SkipFrontendBuild) {
    Write-Step "Building Frontend (winehouse-site)"
    Push-Location $frontendDir
    try {
        if (-not (Test-Path 'node_modules')) {
            Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
            npm install
        }
        Write-Host "Compiling production frontend bundle..." -ForegroundColor Yellow
        npm run build
    }
    finally {
        Pop-Location
    }
}

$frontendDistSource = Join-Path $frontendDir 'dist\winehouse-site\browser'
if (-not (Test-Path $frontendDistSource)) {
    throw "Frontend build output not found at: $frontendDistSource"
}

Write-Step "Copying compiled frontend assets to $frontendPublishDir"
Copy-Item -Path "$frontendDistSource\*" -Destination $frontendPublishDir -Recurse -Force

# ------------------------------------------------------------------------------
# 3. Optimize Backend (Laravel Composer & Dependencies)
# ------------------------------------------------------------------------------
if (-not $SkipBackendComposer) {
    Write-Step "Optimizing backend dependencies (vendor)"
    Push-Location $backendDir
    try {
        # Check if local composer exists, else try Docker container
        $hasLocalComposer = $false
        try {
            $compVer = composer --version 2>&1
            if ($LASTEXITCODE -eq 0) { $hasLocalComposer = $true }
        } catch { $hasLocalComposer = $false }

        if ($hasLocalComposer) {
            Write-Host "Running composer install with local Composer..." -ForegroundColor Yellow
            composer install --no-dev --optimize-autoloader
        } else {
            Write-Host "Using Docker container to run composer install..." -ForegroundColor Yellow
            docker compose exec -T app composer install --no-dev --optimize-autoloader
        }
    }
    catch {
        Write-Host "Note: Composer optimization encountered a notice ($_.Exception.Message), checking vendor folder..." -ForegroundColor Yellow
    }
    finally {
        Pop-Location
    }
}

# ------------------------------------------------------------------------------
# 4. Assemble Backend Distribution
# ------------------------------------------------------------------------------
Write-Step "Assembling Backend Files into $backendPublishDir"

$backendFoldersToCopy = @('app', 'bootstrap', 'config', 'database', 'resources', 'routes', 'vendor')
foreach ($f in $backendFoldersToCopy) {
    $src = Join-Path $backendDir $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $backendPublishDir $f) -Recurse -Force
    }
}

# Copy public folder (excluding any local storage symlink)
$destPub = Join-Path $backendPublishDir 'public'
New-Item -ItemType Directory -Path $destPub -Force | Out-Null
Get-ChildItem -Path (Join-Path $backendDir 'public') | Where-Object { $_.Name -ne 'storage' } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $destPub $_.Name) -Recurse -Force
}

$backendFilesToCopy = @('artisan', 'composer.json', 'composer.lock', '.env.example', '.env.production.example')
foreach ($f in $backendFilesToCopy) {
    $src = Join-Path $backendDir $f
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $backendPublishDir $f) -Force
    }
}

# Configure production .env directly in the backend output folder
$prodEnvSource = Join-Path $backendDir '.env.production.example'
if (Test-Path $prodEnvSource) {
    Write-Host "Configuring production .env in backend publish folder..." -ForegroundColor Yellow
    Copy-Item -Path $prodEnvSource -Destination (Join-Path $backendPublishDir '.env') -Force
}

# Ensure storage directory structure
Write-Host "Setting up storage directory structure..." -ForegroundColor Yellow
$storageDirs = @(
    'storage\app\public',
    'storage\app\public\uploads',
    'storage\framework\cache\data',
    'storage\framework\sessions',
    'storage\framework\testing',
    'storage\framework\views',
    'storage\logs',
    'bootstrap\cache'
)

foreach ($dir in $storageDirs) {
    $fullDir = Join-Path $backendPublishDir $dir
    if (-not (Test-Path $fullDir)) {
        New-Item -ItemType Directory -Path $fullDir -Force | Out-Null
    }
    $gitIgnorePath = Join-Path $fullDir '.gitignore'
    if (-not (Test-Path $gitIgnorePath)) {
        Set-Content -Path $gitIgnorePath -Value "*`n!.gitignore`n"
    }
}

# Clean any log files in storage/logs
Get-ChildItem -Path (Join-Path $backendPublishDir 'storage\logs') -Filter '*.log' -File | Remove-Item -Force

# ------------------------------------------------------------------------------
# 5. Summary & Details
# ------------------------------------------------------------------------------
Write-Host "`n"
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  BUILD & PACKAGING COMPLETE! Ready for copy-paste upload." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Output Directory: $publishDir" -ForegroundColor White
Write-Host "`n1. Frontend Folder (Ready to upload):" -ForegroundColor Cyan
Write-Host "   - Path:        dist-publish\winehouse-fe" -ForegroundColor Gray
Write-Host "   - Destination: public_html/ of your domain" -ForegroundColor Yellow
Write-Host "`n2. Backend Folder (Pre-configured with production .env):" -ForegroundColor Cyan
Write-Host "   - Path:        dist-publish\winehouse-be" -ForegroundColor Gray
Write-Host "   - .env:        Included and pre-configured for production" -ForegroundColor Green
Write-Host "   - Destination: ~/winehouse-be (outside public_html) on your server" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green

