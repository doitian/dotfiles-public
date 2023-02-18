#!/usr/bin/env bash

set -e
set -u
[ -n "${DEBUG:-}" ] && set -x || true

FROM_VERSION="$1"
TO_VERSION="$2"

upgrade() {
  local venv="$1"
  echo "$venv -> python-$TO_VERSION"
  python3 -m venv --upgrade "$venv"
  TO_VERSION_VENV="${venv%-*}-${TO_VERSION}"
  rm -rf "$TO_VERSION_VENV"
  ln -snf "python-$FROM_VERSION" "$TO_VERSION_VENV"
}

for venv in "$HOME"/codebase/*/.direnv/python-"$FROM_VERSION"; do
  upgrade "$venv"
done

for venv in "$HOME"/.dirsenv/*/python-"$FROM_VERSION"; do
  upgrade "$venv"
done
