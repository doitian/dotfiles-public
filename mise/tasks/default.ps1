#MISE dir="{{cwd}}"

# Default task: heuristically determine what to run based on project files

if (Test-Path "Makefile") {
    make @args
    exit $LASTEXITCODE
}

if (Test-Path "Cargo.toml") {
    cargo build @args
    exit $LASTEXITCODE
}

if (Test-Path "package.json") {
    if (Test-Path "pnpm-lock.yaml") {
        pnpm run build @args
    } elseif (Test-Path "yarn.lock") {
        yarn build @args
    } elseif (Test-Path "bun.lockb") {
        bun run build @args
    } else {
        npm run build @args
    }
    exit $LASTEXITCODE
}

if (Test-Path "go.mod") {
    go build @args
    exit $LASTEXITCODE
}

if (Test-Path "pyproject.toml") {
    python -m build @args
    exit $LASTEXITCODE
}

if (Test-Path "CMakeLists.txt") {
    if (-not (Test-Path "build")) {
        New-Item -ItemType Directory -Path "build" | Out-Null
    }
    Push-Location "build"
    cmake ..
    cmake --build . @args
    $exitCode = $LASTEXITCODE
    Pop-Location
    exit $exitCode
}

if (Test-Path "meson.build") {
    if (-not (Test-Path "builddir")) {
        meson setup builddir
    }
    meson compile -C builddir @args
    exit $LASTEXITCODE
}

Write-Error "No recognizable build system found"
exit 1
