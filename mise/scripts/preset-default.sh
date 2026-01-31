#!/usr/bin/env bash
set -euo pipefail

if [ -f "Makefile" ] || [ -f "makefile" ] || [ -f "GNUmakefile" ]; then
    mise tasks add default -- make
    exit 0
fi

if [ -f "Cargo.toml" ]; then
    mise tasks add default -- cargo build
    exit 0
fi

if [ -f "package.json" ]; then
    if [ -f "pnpm-lock.yaml" ]; then
        mise tasks add default -- pnpm run build
    elif [ -f "yarn.lock" ]; then
        mise tasks add default -- yarn build
    elif [ -f "bun.lockb" ]; then
        mise tasks add default -- bun run build
    else
        mise tasks add default -- npm run build
    fi
    exit 0
fi

if [ -f "go.mod" ]; then
    mise tasks add default -- go build
    exit 0
fi

if [ -f "pyproject.toml" ]; then
    mise tasks add default -- python -m build
    exit 0
fi

if [ -f "CMakeLists.txt" ]; then
    mise tasks add default -- cmake --build build
    exit 0
fi

if [ -f "meson.build" ]; then
    mise tasks add default -- meson compile -C builddir
    exit 0
fi

echo "No recognizable build system found" >&2
exit 1
