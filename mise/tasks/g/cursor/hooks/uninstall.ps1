#MISE dir="{{cwd}}"
#MISE description="Uninstall cursor hook from current project"
#USAGE arg "<name>" help="Hook name (e.g., pre-tool-call, post-tool-call)"

param([string]$Name = $args[0])

$ErrorActionPreference = "Stop"
$HooksFile = ".cursor/hooks.json"

if (-not (Test-Path $HooksFile)) {
    Write-Error "No hooks.json found at $HooksFile"
    exit 1
}

$hooks = Get-Content $HooksFile -Raw | ConvertFrom-Json
if ($hooks.hooks.PSObject.Properties[$Name]) {
    $hooks.hooks.PSObject.Properties.Remove($Name)
}
$hooks | ConvertTo-Json -Depth 10 | Set-Content $HooksFile -NoNewline
Write-Host "Uninstalled hook '$Name'"
