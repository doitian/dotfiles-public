#MISE dir="~"
#MISE description="Install OpenAgents installer"

$binDir = "$env:USERPROFILE\.local\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$installerPath = "$binDir\openagents-installer"
$wrapperPath = "$binDir\openagents-installer.ps1"

Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/darrenhinde/OpenAgentsControl/main/install.sh' -OutFile $installerPath

# Create PowerShell wrapper that invokes the bash script using sh.exe and forwards arguments
@"
sh.exe "$installerPath" @args
"@ | Set-Content -Path $wrapperPath
