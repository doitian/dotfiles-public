#!/bin/bash

set -u

target_dir="$HOME/Applications"
rm -rf "$target_dir/nvim-osx64"
curl -L -o - https://github.com/neovim/neovim/releases/download/nightly/nvim-macos.tar.gz | tar -xzvf - -C "$target_dir"
