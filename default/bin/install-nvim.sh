#!/bin/bash

set -u

if [ "$(uname -s)" = "Darwin" ]; then
  source_url="https://github.com/neovim/neovim/releases/download/nightly/nvim-macos.tar.gz"
  target_dir="$HOME/Applications"
  package_name="nvim-osx64"
else
  source_url="https://github.com/neovim/neovim/releases/download/nightly/nvim-linux64.tar.gz"
  target_dir="$HOME/Applications"
  mkdir -p "$target_dir"
  package_name="nvim-linux64"
fi

rm -rf "$target_dir/$package_name"
curl -L -o - | tar -xzvf - -C "$target_dir"
