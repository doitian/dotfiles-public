#!/usr/bin/env bash

set -o nounset # error when referencing undefined variable
set -o errexit # exit when command fails

# Use package feature to install coc.nvim

# for vim8
mkdir -p ~/.vim/pack/coc/opt
cd ~/.vim/pack/coc/opt
curl --fail -L https://github.com/neoclide/coc.nvim/archive/release.tar.gz | tar xzfv -
rm -rf coc
mv coc.nvim-release coc

# Install extensions
mkdir -p ~/.config/coc/extensions
cd ~/.config/coc/extensions
if [ ! -f package.json ]; then
  echo '{"dependencies":{}}' >package.json
fi
# Change extension names to the extensions you need
#npm install coc-snippets --global-style --ignore-scripts --no-bin-links --no-package-lock --only=prod
