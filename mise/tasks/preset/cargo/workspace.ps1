#MISE dir="{{cwd}}"
#MISE depends=["preset:rust"]
#MISE description="Create a Cargo workspace"

if (-not (Test-Path -Path "Cargo.toml")) {
    $content = "[workspace]`nresolver = `"3`"`n"
    Set-Content -Path "Cargo.toml" -Value $content -NoNewline -Encoding UTF8
}
