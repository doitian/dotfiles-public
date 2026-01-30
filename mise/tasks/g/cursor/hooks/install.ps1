#MISE dir="{{cwd}}"
#MISE description="Install cursor hook for current project"
#USAGE arg "<name>" help="Hook name (e.g., pre-tool-call, post-tool-call)"

param([string]$Name = $args[0])

$ErrorActionPreference = "Stop"
$HooksFile = ".cursor/hooks.json"
$HookCmd = "mise run g:cursor:hooks:run $Name"

if (-not (Test-Path ".cursor")) {
    New-Item -ItemType Directory -Path ".cursor" -Force | Out-Null
}

$hooksHash = @{ version = 1; hooks = @{} }
if (Test-Path $HooksFile) {
    $existing = Get-Content $HooksFile -Raw | ConvertFrom-Json
    if ($existing.hooks) {
        $existing.hooks.PSObject.Properties | ForEach-Object { $hooksHash.hooks[$_.Name] = $_.Value }
    }
}
$hooksHash.hooks[$Name] = @(@{ command = $HookCmd })

$hooksHash | ConvertTo-Json -Depth 10 | Set-Content $HooksFile -NoNewline
Write-Host "Installed hook '$Name' -> $HookCmd"
