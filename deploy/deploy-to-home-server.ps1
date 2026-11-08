#Requires -Version 5.1
# One-click deploy to home-server, same pattern as ACS.Simulator:
#   publish locally -> scp to /tmp -> swap into /home/ducne/engmastery -> systemctl restart
# Prerequisites once on home-server: copy deploy/engmastery.service to
# /etc/systemd/system/ and `sudo systemctl enable engmastery`.
$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
$RepoRoot = (Get-Item $ScriptDir).Parent.FullName

$RemoteHost = 'home-server'
$RemoteUser = 'ducne'
$RemoteDir = "/home/$RemoteUser/engmastery"
$Password = '66668888'

# 1. Build
Write-Host "[1/3] Building distribution..." -ForegroundColor Yellow
& (Join-Path $ScriptDir 'build-home-server.ps1')
if ($LASTEXITCODE -ne 0) { throw "Build failed!" }

# 2. Transfer
Write-Host "`n[2/3] Transferring package to $RemoteHost..." -ForegroundColor Yellow
$distPath = Join-Path $RepoRoot 'dist-engmastery'
ssh -o BatchMode=yes "$RemoteHost" "rm -rf /tmp/engmastery-update"
if ($LASTEXITCODE -ne 0) { throw "Could not clean remote staging directory!" }
scp -r -o BatchMode=yes "$distPath" "${RemoteHost}:/tmp/engmastery-update"
if ($LASTEXITCODE -ne 0) { throw "SCP transfer failed!" }

# 3. Install + restart (preserve SQLite data + uploaded wwwroot changes are overwritten by design)
Write-Host "`n[3/3] Installing and restarting service on $RemoteHost..." -ForegroundColor Yellow
$serviceFile = Join-Path $ScriptDir 'engmastery.service'
scp -o BatchMode=yes "$serviceFile" "${RemoteHost}:/tmp/engmastery.service"
$sshCommand = @"
echo '$Password' | sudo -S cp /tmp/engmastery.service /etc/systemd/system/engmastery.service
echo '$Password' | sudo -S systemctl daemon-reload
echo '$Password' | sudo -S systemctl enable engmastery
echo '$Password' | sudo -S systemctl stop engmastery
echo '$Password' | sudo -S mkdir -p $RemoteDir
echo '$Password' | sudo -S cp -f $RemoteDir/server/engmastery.db /tmp/engmastery-data-backup.db || true
echo '$Password' | sudo -S rm -rf $RemoteDir/server
echo '$Password' | sudo -S mv /tmp/engmastery-update/server $RemoteDir/server
echo '$Password' | sudo -S cp -f /tmp/engmastery-data-backup.db $RemoteDir/server/engmastery.db || true
echo '$Password' | sudo -S rm -f /tmp/engmastery-data-backup.db
echo '$Password' | sudo -S chmod +x $RemoteDir/server/EngMastery.Api
echo '$Password' | sudo -S chown -R ${RemoteUser}:${RemoteUser} $RemoteDir
echo '$Password' | sudo -S systemctl start engmastery
echo '$Password' | sudo -S systemctl status engmastery --no-pager
"@
$cleanSshCommand = $sshCommand.Replace("`r", "")
& ssh $RemoteHost $cleanSshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nEngMastery deployed: http://home-server:8090" -ForegroundColor Green
} else {
    Write-Host "`nDeploy failed - service did not restart cleanly." -ForegroundColor Red
}
