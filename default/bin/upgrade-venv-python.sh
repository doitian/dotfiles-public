#!/usr/bin/env bash

set -e
set -u
[ -n "${DEBUG:-}" ] && set -x || true

FROM_VERSION="$1"
TO_VERSION="$2"
shift
shift

upgrade() {
  local venv="$1"
  echo "$venv -> python-$TO_VERSION"
  python3 -m venv --upgrade "$venv"
  TO_VERSION_VENV="${venv%-*}-${TO_VERSION}"
  rm -rf "$TO_VERSION_VENV"
  ln -snf "python-$FROM_VERSION" "$TO_VERSION_VENV"
}

if [ "$#" = 0 ]; then
  for venv in "$HOME"/codebase/*/.direnv/python-"$FROM_VERSION"; do
    upgrade "$venv"
  done

  for venv in "$HOME"/.dirsenv/*/python-"$FROM_VERSION"; do
    upgrade "$venv"
  done
else
  for venv; do
    upgrade "$venv"
  done
fi
