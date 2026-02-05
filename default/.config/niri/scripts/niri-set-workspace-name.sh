#!/usr/bin/env bash

set -e
set -u
[ -n "${DEBUG:-}" ] && set -x || true

name="$(fuzzel -d -l 0 --prompt ' ' || true)"
if [ -n "$name" ]; then
    niri msg action set-workspace-name "$name"
else
    niri msg action unset-workspace-name
fi
