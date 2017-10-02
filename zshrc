#!/bin/zsh

if [[  "$-" != *i* ]]; then return 0; fi

ZSH_CUSTOM="$HOME/.dotfiles/zsh"
ZSH="$HOME/.oh-my-zsh"
ZSH_CACHE_DIR="$HOME/.zcompcache"
COMPLETION_WAITING_DOTS=true
DISABLE_AUTO_TITLE=true

fpath=($HOME/.zsh-completions $ZSH/plugins/brew $ZSH/plugins/docker $ZSH/plugins/gitfast $fpath)

zstyle :omz:plugins:ssh-agent agent-forwarding on
zstyle :omz:plugins:ssh-agent identities id_rsa

# Figure out the SHORT hostname
if [[ "$OSTYPE" = darwin* ]]; then
  # OS X's $HOST changes with dhcp, etc. Use ComputerName if possible.
  SHORT_HOST=$(scutil --get ComputerName 2>/dev/null) || SHORT_HOST=${HOST/.*/}
else
  SHORT_HOST=${HOST/.*/}
fi
ZSH_COMPDUMP="$HOME/.zcompdump-${SHORT_HOST}-${ZSH_VERSION}"

# Load and run compinit
autoload -U compinit
compinit -i -d "${ZSH_COMPDUMP}"
