#Requires -Version 5.1
# One-click deploy to home-server, same pattern as ACS.Simulator:
#   publish locally -> scp to /tmp -> swap into /home/ducne/engmastery -> systemctl restart
# Prerequisites once on home-server (see README):
#   sudo install -m 0440 -o root -g root deploy/sudoers.engmastery /etc/sudoers.d/engmastery-deploy
# No server password belongs in this file: sudo is passwordless for exactly the commands below.
$ErrorActionPreference = 'Stop'
$ScriptDir = $PSScriptRoot
$RepoRoot = (Get-Item $ScriptDir).Parent.FullName

$RemoteHost = 'home-server'
$RemoteUser = 'ducne'
$RemoteDir = "/home/$RemoteUser/engmastery"

# Fail fast (before the long build) if the server-side sudoers rule is missing.
Write-Host "[0/3] Checking passwordless sudo on $RemoteHost..." -ForegroundColor Yellow
$sudoList = ssh -o BatchMode=yes "$RemoteHost" "sudo -n -l 2>&1" | Out-String
if ($LASTEXITCODE -ne 0 -or $sudoList -notmatch 'systemctl stop engmastery') {
    throw "Passwordless sudo is not configured on $RemoteHost. Install deploy/sudoers.engmastery once (see README)."
}

# 1. Build
Write-Host "[1/3] Building distribution..." -ForegroundColor Yellow
& (Join-Path $ScriptDir 'build-home-server.ps1')
if ($LASTEXITCODE -ne 0) { throw "Build failed!" }

# 2. Transfer
Write-Host "`n[2/3] Transferring package to $RemoteHost..." -ForegroundColor Yellow
$distPath = Join-Path $RepoRoot 'dist-engmastery'
$serverPath = Join-Path $distPath 'server'
ssh -o BatchMode=yes "$RemoteHost" "rm -rf /tmp/engmastery-update && mkdir -p /tmp/engmastery-update"
if ($LASTEXITCODE -ne 0) { throw "Could not clean remote staging directory!" }
scp -r -o BatchMode=yes "$serverPath" "${RemoteHost}:/tmp/engmastery-update/"
if ($LASTEXITCODE -ne 0) { throw "SCP transfer failed!" }

# 3. Install + restart (preserve SQLite data + uploaded wwwroot changes are overwritten by design)
Write-Host "`n[3/3] Installing and restarting service on $RemoteHost..." -ForegroundColor Yellow
$serviceFile = Join-Path $ScriptDir 'engmastery.service'
scp -o BatchMode=yes "$serviceFile" "${RemoteHost}:/tmp/engmastery.service"
$sshCommand = @"
sudo -n cp -f /tmp/engmastery.service /etc/systemd/system/engmastery.service || { echo 'Service file install failed'; exit 1; }
sudo -n systemctl daemon-reload || { echo 'daemon-reload failed'; exit 1; }
sudo -n systemctl enable engmastery >/dev/null 2>&1 || { echo 'systemctl enable failed'; exit 1; }
sudo -n systemctl stop engmastery || { echo 'systemctl stop failed'; exit 1; }
mkdir -p $RemoteDir $RemoteDir/data
# One-time migration: move DB out of the replaced server/ folder into data/ (kept across deploys).
if [ -f $RemoteDir/server/engmastery.db ] && [ ! -f $RemoteDir/data/engmastery.db ]; then cp -f $RemoteDir/server/engmastery.db $RemoteDir/data/engmastery.db || { echo 'DB migration failed'; exit 1; }; fi
# Timestamped backup; abort if backup fails or is empty.
cp -f $RemoteDir/data/engmastery.db /tmp/engmastery-data-backup.db || { echo 'DB backup failed'; exit 1; }
if [ ! -s /tmp/engmastery-data-backup.db ]; then echo 'DB backup is empty, aborting'; exit 1; fi
# Persistent rotating backup inside data/ (survives /tmp cleanup and failed deploys).
cp -f $RemoteDir/data/engmastery.db $RemoteDir/data/engmastery.db.bak.`$(date +%Y%m%d-%H%M%S)
ls -t $RemoteDir/data/engmastery.db.bak.* 2>/dev/null | tail -n +4 | xargs -r rm -f
rm -rf $RemoteDir/server
mv /tmp/engmastery-update/server $RemoteDir/server || { echo 'Server swap failed'; exit 1; }
cp -f /tmp/engmastery-data-backup.db $RemoteDir/data/engmastery.db
rm -f /tmp/engmastery-data-backup.db
chmod -R u+rwX $RemoteDir
chmod +x $RemoteDir/server/EngMastery.Api
# One-time login password for the access gate. Kept in data/ so it survives every deploy.
if [ ! -f $RemoteDir/data/auth.env ]; then
  umask 077
  printf 'Auth__Password=%s\n' "`$(head -c 24 /dev/urandom | base64 | tr -d '\n=')" > $RemoteDir/data/auth.env
  echo ''
  echo '=== EngMastery access password (save this once) ==='
  cat $RemoteDir/data/auth.env
  echo '=================================================='
fi
chmod 600 $RemoteDir/data/auth.env
sudo -n systemctl start engmastery || { echo 'systemctl start failed'; exit 1; }
systemctl status engmastery --no-pager | head -n 8
"@
$cleanSshCommand = $sshCommand.Replace("`r", "")
# ssh/sudo write prompts to stderr; don't let $ErrorActionPreference='Stop' fake a failure.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& ssh $RemoteHost $cleanSshCommand 2>&1 | ForEach-Object { "$_" }
$sshExit = $LASTEXITCODE
$ErrorActionPreference = $prevEAP

if ($sshExit -eq 0) {
    Write-Host "`nEngMastery deployed: http://home-server:8090" -ForegroundColor Green
} else {
    Write-Host "`nDeploy failed - service did not restart cleanly." -ForegroundColor Red
}
