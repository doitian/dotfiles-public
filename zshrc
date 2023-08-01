#!/bin/zsh

if [[ "$-" != *i* ]]; then return 0; fi

if [[ $COLORTERM =~ ^(truecolor|24bit)$ ]]; then
  export LAZY=1
fi
if [[ -n "$SSH_TTY" && -S "$SSH_AUTH_SOCK" ]]; then
  SSH_AGENT_FORWARD_AUTH_SOCK="$SSH_AUTH_SOCK"
fi
ZSH="$HOME/.oh-my-zsh"
ZSH_CACHE_DIR="$HOME/.zcompcache"
COMPLETION_WAITING_DOTS=true
GIT_PS1_SHOWUPSTREAM=auto
MAGIC_ENTER_GIT_COMMAND='g st -u .'
MAGIC_ENTER_OTHER_COMMAND='ls -lh .'
SHELLPROXY_URL='http://127.0.0.1:7890'

if [ -d "$HOME/.asdf" ]; then
  fpath=($HOME/.asdf/completions $fpath)
fi

fpath=(
  "$ZSH_CACHE_DIR/completions"
  "$HOME/.zsh-completions"
  "$ZSH/plugins/brew"
  "$ZSH/plugins/docker"
  "$ZSH/plugins/gitfast"
  "$ZSH/plugins/cargo"
  $fpath
)

# Figure out the SHORT hostname
if [[ "$OSTYPE" = darwin* ]]; then
  # OS X's $HOST changes with dhcp, etc. Use ComputerName if possible.
  SHORT_HOST=$(scutil --get ComputerName 2>/dev/null) || SHORT_HOST=${HOST/.*/}
else
  SHORT_HOST=${HOST/.*/}
fi
ZSH_COMPDUMP="$HOME/.zcompdump-${SHORT_HOST}-${ZSH_VERSION}"

# Load and run compinit
autoload -U compaudit compinit
() {
  setopt extendedglob local_options
  if [[ -f "$ZSH_COMPDUMP"(#qN.m+1) ]]; then
    compinit -i -d "${ZSH_COMPDUMP}"
    touch "${ZSH_COMPDUMP}"
  else
    compinit -C -i -d "${ZSH_COMPDUMP}"
  fi
}
