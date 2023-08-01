#!/bin/bash

# List recent modified files
function lslt() {
  if [ -n "$1" ]; then
    ls -ltrsa "$@" | tail
  else
    ls -ltrsad * | tail
  fi
}

# groot(skip = 0)
#
# Go up until .git directory found.
# @param skip skip this number of .git and continue go up
function groot() {
  local -i skip="${1:-0}"
  local cdup
  cdup="$(git rev-parse --show-cdup)"
  while ((skip > 0)); do
    cdup="$cdup/../$(git -C "$cdup/.." rev-parse --show-cdup)"
    let skip=skip-1
  done
  cd "$cdup"
}

function hs { [ -z "$1" ] && history || (history | grep "$@"); }

function marked() {
  if [ "$1" ]; then
    open -a "Marked 2.app" "$1"
  else
    open -a "Marked 2.app"
  fi
}

function fomz() {
  local plugindir="$HOME/.oh-my-zsh/plugins"
  local plugin="$(fd --type d -d 1 . "$plugindir" -x echo '{/}' | sort | fzf --preview 'f() {bat --color always "$HOME/.oh-my-zsh/plugins/$1/README.md"; }; f {}')"
  if [ -n "$plugin" ]; then
    source "$plugindir/$plugin/$plugin.plugin.zsh"
  fi
}

function femoji() {
  if [ "$#emoji" = 0 ]; then
    source "$HOME/.oh-my-zsh/plugins/emoji/emoji.plugin.zsh"
  fi
  printf ":%s: %s\n" "${(kv)emoji[@]}" | fzf "$@"
}

# Copy from https://github.com/MorganGeek/dotfiles/blob/master/dot_zsh_functions#L165
function top-commands() {
  local max_results="${1:-50}"
  history | \cat | awk '{$1=$1};1' | sed 's/^[0-9\* TAB]*//g' | awk '{CMD[$0]++;count++;}END { for (a in CMD)print CMD[a] " " CMD[a]/count*100 "%\t" a; }' | sort --numeric-sort --reverse | nl | head -n "$max_results"
}

function gfw() {
  case "${1:-show}" in
    show)
      command gfw
      ;;
    enable|disable)
      eval "$(command gfw $1)"
      echo "proxy ${1}d"
      ;;
    *)
      command gfw "$@"
      ;;
  esac
}
