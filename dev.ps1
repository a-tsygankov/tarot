# Start both dev servers for local development.
# Usage: .\dev.ps1
#
# Prerequisites:
#   - npm ci in client/ and workers/tarot-api/
#   - Copy workers/tarot-api/.dev.vars.example -> .dev.vars and add API keys

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check prerequisites
if (-not (Test-Path "$Root\client\node_modules")) {
    Write-Host "Installing client dependencies..."
    Push-Location "$Root\client"
    npm ci
    Pop-Location
}

if (-not (Test-Path "$Root\workers\tarot-api\node_modules")) {
    Write-Host "Installing worker dependencies..."
    Push-Location "$Root\workers\tarot-api"
    npm ci
    Pop-Location
}

if (-not (Test-Path "$Root\workers\tarot-api\.dev.vars")) {
    Write-Warning "workers/tarot-api/.dev.vars not found!"
    Write-Host "Copy .dev.vars.example -> .dev.vars and add your API keys."
    Write-Host ""
}

Write-Host ""
Write-Host "Starting Tarot Oracle dev environment..." -ForegroundColor Yellow
Write-Host "  Client: http://localhost:3000/tarot/"
Write-Host "  Worker: http://localhost:8787"
Write-Host "  Press Ctrl+C to stop both servers."
Write-Host ""

# Start wrangler in background
$wrangler = Start-Process -NoNewWindow -PassThru -FilePath "npx" `
    -ArgumentList "wrangler dev --port 8787" `
    -WorkingDirectory "$Root\workers\tarot-api"

# Start vite in background
$vite = Start-Process -NoNewWindow -PassThru -FilePath "npx" `
    -ArgumentList "vite --port 3000" `
    -WorkingDirectory "$Root\client"

# Clean up on exit
$cleanup = {
    Write-Host ""
    Write-Host "Shutting down..." -ForegroundColor Yellow
    if ($wrangler -and -not $wrangler.HasExited) {
        Stop-Process -Id $wrangler.Id -Force -ErrorAction SilentlyContinue
    }
    if ($vite -and -not $vite.HasExited) {
        Stop-Process -Id $vite.Id -Force -ErrorAction SilentlyContinue
    }
}

try {
    # Register cleanup for Ctrl+C
    [Console]::TreatControlCAsInput = $false

    # Wait for either process to exit
    while (-not $wrangler.HasExited -and -not $vite.HasExited) {
        Start-Sleep -Milliseconds 500
    }
} finally {
    & $cleanup
}
