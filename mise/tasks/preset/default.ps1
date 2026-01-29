#MISE dir="{{cwd}}"
#MISE description="Detect build system and create a simple default task"

if (Test-Path "Makefile") {
    mise tasks add default -- make
    exit 0
}

if (Test-Path "Cargo.toml") {
    mise tasks add default -- cargo build
    exit 0
}

if (Test-Path "package.json") {
    if (Test-Path "pnpm-lock.yaml") {
        mise tasks add default -- pnpm run build
    } elseif (Test-Path "yarn.lock") {
        mise tasks add default -- yarn build
    } elseif (Test-Path "bun.lockb") {
        mise tasks add default -- bun run build
    } else {
        mise tasks add default -- npm run build
    }
    exit 0
}

if (Test-Path "go.mod") {
    mise tasks add default -- go build
    exit 0
}

if (Test-Path "pyproject.toml") {
    mise tasks add default -- python -m build
    exit 0
}

if (Test-Path "CMakeLists.txt") {
    mise tasks add default -- cmake --build build
    exit 0
}

if (Test-Path "meson.build") {
    mise tasks add default -- meson compile -C builddir
    exit 0
}

Write-Error "No recognizable build system found"
exit 1
