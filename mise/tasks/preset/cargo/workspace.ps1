#MISE dir="{{cwd}}"
#MISE depends=["preset:rust"]

if (-not (Test-Path -Path "Cargo.toml")) {
    $content = "[workspace]`nresolver = `"3`"`n"
    Set-Content -Path "Cargo.toml" -Value $content -NoNewline -Encoding UTF8
}
