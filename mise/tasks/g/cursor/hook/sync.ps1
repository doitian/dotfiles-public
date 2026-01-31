#MISE dir="{{cwd}}"
#MISE description="Sync mise cursor:*:on:* tasks to .cursor/hooks.json"

$ErrorActionPreference = "Stop"

$hooksFile = ".cursor\hooks.json"

# Create .cursor directory if it doesn't exist
if (-not (Test-Path ".cursor")) {
    New-Item -ItemType Directory -Path ".cursor" | Out-Null
}

# Get all cursor:*:on:* tasks
$taskOutput = mise tasks 2>&1
$tasks = $taskOutput | Where-Object { $_ -match '^cursor:[^:]+:on:\S+' } | ForEach-Object {
    ($_ -split '\s+')[0]
}

if (-not $tasks -or $tasks.Count -eq 0) {
    Write-Host "No cursor:*:on:* tasks found"
    if (Test-Path $hooksFile) {
        Remove-Item $hooksFile
        Write-Host "Deleted $hooksFile"
    }
    exit 0
}

# Build hooks structure
$hooks = @{}

foreach ($task in $tasks) {
    if ($task -match '^cursor:([^:]+):on:(\S+)$') {
        $hookName = $Matches[2]
        $command = "mise run $task"

        if (-not $hooks.ContainsKey($hookName)) {
            $hooks[$hookName] = @()
        }
        $hooks[$hookName] += @{ command = $command }
    }
}

# Build the final JSON structure
$jsonObject = [ordered]@{
    version = 1
    hooks = [ordered]@{}
}

foreach ($hookName in $hooks.Keys | Sort-Object) {
    $jsonObject.hooks[$hookName] = $hooks[$hookName]
}

# Write JSON to file with Linux line endings (LF)
$json = $jsonObject | ConvertTo-Json -Depth 10
$json = $json -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($hooksFile, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "Updated $hooksFile with $($tasks.Count) task(s)"
