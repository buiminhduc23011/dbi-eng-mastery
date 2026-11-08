#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$RepoRoot = (Get-Item $PSScriptRoot).Parent.FullName
$DistDir = Join-Path $RepoRoot 'dist-engmastery'

Write-Host "[1/3] Publishing backend (linux-x64, self-contained)..." -ForegroundColor Yellow
& dotnet publish (Join-Path $RepoRoot 'backend/EngMastery.Api/EngMastery.Api.csproj') `
  -c Release -r linux-x64 --self-contained true `
  -o (Join-Path $DistDir 'server') /p:PublishSingleFile=false
if ($LASTEXITCODE -ne 0) { throw "Backend publish failed!" }

Write-Host "`n[2/3] Building frontend..." -ForegroundColor Yellow
Push-Location (Join-Path $RepoRoot 'frontend')
& npm ci
if ($LASTEXITCODE -ne 0) { throw "npm ci failed!" }
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed!" }
Pop-Location

Write-Host "`n[3/3] Copying frontend dist -> server/wwwroot..." -ForegroundColor Yellow
$wwwroot = Join-Path $DistDir 'server/wwwroot'
if (Test-Path $wwwroot) { Remove-Item $wwwroot -Recurse -Force }
New-Item -ItemType Directory $wwwroot | Out-Null
Copy-Item (Join-Path $RepoRoot 'frontend/dist/*') $wwwroot -Recurse -Force

Write-Host "`nBuild OK: $DistDir" -ForegroundColor Green
Get-ChildItem $DistDir -Recurse | Measure-Object | ForEach-Object { Write-Host ("  files: " + $_.Count) }
