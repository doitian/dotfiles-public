#!/bin/bash

set -e

if ! [ -d ~/.fresh/source/freshshell/fresh ]; then
  git clone https://github.com/freshshell/fresh ~/.fresh/source/freshshell/fresh
fi

ln -snf ~/.dotfiles/freshrc ~/.freshrc

~/.fresh/source/freshshell/fresh/bin/fresh # run fresh
