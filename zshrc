#!/bin/zsh

if [[  "$-" != *i* ]]; then return 0; fi

ZSH_CUSTOM="$HOME/.dotfiles/zsh"
ZSH_CACHE_DIR="$ZSH/cache/"
ZSH="$HOME/.fresh/source/robbyrussell/oh-my-zsh"
JIRA_RAPID_BOARD=yes

zstyle :omz:plugins:ssh-agent agent-forwarding on

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

source "$HOME/.fresh/build/shell.sh"

export LESS='--RAW-CONTROL-CHARS --quiet --HILITE-UNREAD --ignore-case --long-prompt'
export TMUX_TTY="$TTY"
unset LSCOLORS
