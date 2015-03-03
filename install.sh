#!/bin/bash

git clone https://github.com/freshshell/fresh ~/.fresh/source/freshshell/fresh
ln -snf ~/.dotfiles/freshrc ~/.freshrc
~/.fresh/source/freshshell/fresh/bin/fresh # run fresh
