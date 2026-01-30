#MISE dir="{{cwd}}"
#MISE description="Run cursor hooks"
#USAGE arg "<name>" help="Hook name (e.g., stop, pre-tool-call, post-tool-call)"

param([string]$Name = $args[0])

$ErrorActionPreference = "Stop"
$InputJson = [System.Console]::In.ReadToEnd()

switch ($Name) {
    "stop" {
        $inputObj = if ($InputJson) { $InputJson | ConvertFrom-Json } else { [PSCustomObject]@{} }
        $status = if ($inputObj.status) { $inputObj.status } else { "unknown" }
        & agent-pushover -t "Cursor Agent Stopped" "status: $status"
        Write-Output '{}'
    }
    default {
        Write-Error "Unsupported hook name: $Name"
        exit 1
    }
}
