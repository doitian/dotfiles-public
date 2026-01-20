#MISE dir="{{cwd}}"

# Get mise shims path using mise activate pwsh --shims
# Extract the shims path from the $Env:PATH assignment
# Format: $Env:PATH='/path/to/shims'+[IO.Path]::PathSeparator+$env:PATH
$miseShimsPath = $env:MISE_SHIMS_PATH
if (-not $miseShimsPath) {
    try {
        $activateOutput = mise activate pwsh --shims 2>$null
        $pathLine = $activateOutput | Select-String -Pattern '\$Env:PATH\s*=' | Select-Object -First 1
        if ($pathLine) {
            # Extract path from: $Env:PATH='/path/to/shims'+[IO.Path]::PathSeparator+$env:PATH
            # Use double quotes for regex pattern to avoid single quote escaping issues
            $match = $pathLine -match "\$Env:PATH\s*=\s*'([^']+)'"
            if ($match) {
                $miseShimsPath = $matches[1]
            }
        }
    } catch {
        # Fallback to default
    }
}

# Fallback to default if command failed or path is empty
if (-not $miseShimsPath -or -not (Test-Path $miseShimsPath)) {
    $miseShimsPath = "$env:USERPROFILE\.local\share\mise\shims"
}

# Normalize path (expand environment variables, resolve)
$miseShimsPath = [System.Environment]::ExpandEnvironmentVariables($miseShimsPath)
$miseShimsPath = (Resolve-Path $miseShimsPath -ErrorAction SilentlyContinue).Path
if (-not $miseShimsPath) {
    $miseShimsPath = "$env:USERPROFILE\.local\share\mise\shims"
}

# Create .vscode directory if it doesn't exist
if (-not (Test-Path .vscode)) {
    New-Item -ItemType Directory -Path .vscode | Out-Null
}

# Path to settings.json
$settingsFile = ".vscode\settings.json"

# Create settings.json with empty object if it doesn't exist
if (-not (Test-Path $settingsFile)) {
    $jsonContent = @{} | ConvertTo-Json -Depth 10
    # Ensure LF line endings (replace CRLF with LF)
    $jsonContent = $jsonContent -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($settingsFile, $jsonContent, [System.Text.UTF8Encoding]::new($false))
}

# Read current settings
$settings = Get-Content $settingsFile -Raw | ConvertFrom-Json

# Ensure the terminal.integrated.env.windows object exists
if (-not $settings.'terminal.integrated.env.windows') {
    $settings | Add-Member -MemberType NoteProperty -Name 'terminal.integrated.env.windows' -Value @{} -Force
}

# Update PATH to prepend mise shims
# Format: "PATH": "C:\path\to\shims;${env:PATH}"
$settings.'terminal.integrated.env.windows'.PATH = "$miseShimsPath;`${env:PATH}"

# Write back with proper formatting and LF line endings
$jsonContent = $settings | ConvertTo-Json -Depth 10
# Ensure LF line endings (replace CRLF with LF)
$jsonContent = $jsonContent -replace "`r`n", "`n"
[System.IO.File]::WriteAllText($settingsFile, $jsonContent, [System.Text.UTF8Encoding]::new($false))

Write-Host "Updated $settingsFile with mise shims path for windows: $miseShimsPath"
