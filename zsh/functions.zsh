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

# vman
#
# Open vim to read man
function vman() {
  if (($#)); then
    title='man:'
    for arg in $@; do
      if ! echo "$arg" | grep -q '^[0-9]\+\|\(-.*\)$'; then
        title="$title $arg"
      fi
    done
    title="$(sed 's/ /\\\\ /g' <<<"$title")"

    if /usr/bin/man -w $@ >/dev/null 2>/dev/null; then
      /usr/bin/man $@ | col -b | vim -c "set ft=man nomod nonumber nolist fdm=indent fdn=2 sw=4 foldlevel=2 ro ignorecase incsearch hlsearch titlestring=$title | nmap q :q!<CR> | nmap <HOME> gg | nmap <END> G" -
    else
      echo No man page for $* >&2
    fi
  else
    /usr/bin/man
  fi
}

function hs { [ -z "$1" ] && history || (history | grep "$@"); }

function nocaps {
  setxkbmap -option ctrl:nocaps
}

function marked() {
  if [ "$1" ]; then
    open -a "Marked 2.app" "$1"
  else
    open -a "Marked 2.app"
  fi
}

function cbcb() {
  local dir="$(fasd -dl | grep -v '^/Volumes' | sed 's|$|/.git|' | tr '\n' '\0' | xargs -0 ls -d 2>/dev/null | sed -e 's/.git$//' -e "s;^$HOME/;;" | fzf -1 -q "$*")"
  if [ -n "$dir" ]; then
    if [ -d "$dir" ]; then
      cd "$dir"
    else
      cd "$HOME/$dir"
    fi
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
function top_commands() {
  local max_results="${1:-50}"
  history | \cat | awk '{$1=$1};1' | sed 's/^[0-9\* TAB]*//g' | awk '{CMD[$0]++;count++;}END { for (a in CMD)print CMD[a] " " CMD[a]/count*100 "%\t" a; }' | sort --numeric-sort --reverse | nl | head -n "$max_results"
}
