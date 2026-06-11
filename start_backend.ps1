<#
.SYNOPSIS
Starts the Bulk Order Automation backend.

.DESCRIPTION
This script automates the process of setting up and running the FastAPI backend.
It checks for Python, creates a virtual environment if one does not exist,
activates the environment, installs requirements, installs playwright browsers,
and starts the uvicorn server.
#>

$ErrorActionPreference = "Stop"

$BackendDir = Join-Path $PSScriptRoot "backend"
$VenvDir = Join-Path $BackendDir "venv"
$RequirementsFile = Join-Path $BackendDir "requirements.txt"

Write-Host "Starting Backend Setup..." -ForegroundColor Cyan

# 1. Check if backend directory exists
if (-not (Test-Path $BackendDir)) {
    Write-Error "Backend directory not found at $BackendDir"
    exit 1
}

Set-Location $BackendDir

# 2. Check for Python
if (-not (Get-Command "python" -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in the PATH."
    exit 1
}

# 3. Create Virtual Environment if it doesn't exist
if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create virtual environment."
        exit 1
    }
}

# 4. Activate Virtual Environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
$ActivateScript = Join-Path $VenvDir "Scripts\Activate.ps1"
if (-not (Test-Path $ActivateScript)) {
    # Try Linux/Mac path just in case
    $ActivateScript = Join-Path $VenvDir "bin\activate.ps1"
}

if (Test-Path $ActivateScript) {
    . $ActivateScript
} else {
    Write-Error "Could not find activation script at $ActivateScript"
    exit 1
}

# 5. Install Requirements
Write-Host "Installing dependencies..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install --pre -r $RequirementsFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies."
    exit 1
}

# 6. Install Playwright Browsers
Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
playwright install chromium
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Playwright install returned an error, but continuing..."
}

# 7. Start Uvicorn
Write-Host "Starting FastAPI server with Uvicorn..." -ForegroundColor Green
uvicorn app.main:app --reload
