#!/usr/bin/env bash
set -euo pipefail

mise tasks add pre-commit:cargo-fmt -- cargo fmt --check

if command -v cargo-nextest &>/dev/null; then
    mise config set tasks.test.run 'cargo nextest run --no-fail-fast{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}'
else
    mise config set tasks.test.run 'cargo test --no-fail-fast --{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}'
fi
mise config set tasks.test.usage 'arg "[filters]" var=#true'
