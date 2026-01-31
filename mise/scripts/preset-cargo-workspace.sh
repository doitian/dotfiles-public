#!/usr/bin/env bash
set -euo pipefail

if [ ! -f "Cargo.toml" ]; then
    printf '[workspace]\nresolver = "3"\n' >Cargo.toml
fi
