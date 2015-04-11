#!/bin/bash

# List recent modified files
function lslt() {
  if [ -n "$1" ]; then
    ls -ltrsa "$@" | tail
  else
    ls -ltrsad * | tail
  fi
}

# proot(skip = 0)
#
# Go up until .git directory found.
# @param skip skip this number of .git and continue go up
function proot() {
  local -i skip=
  [ -n "$1" ] && skip="$1"
  local dir=`pwd`
  dir=${dir%/}

  until [ -z "$dir" ] || [ "$skip" -le 0 -a -d "$dir/.git" ]; do
    if [ -d "$dir/.git" ]; then
      let skip=skip-1
    fi
    dir=${dir%/*}
  done

  cd "$dir/"
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
    title="`sed 's/ /\\\\ /g' <<< "$title"`"

    if /usr/bin/man -w $@ >/dev/null 2>/dev/null; then
      /usr/bin/man $@ | col -b | vim -c "set ft=man nomod nonumber nolist fdm=indent fdn=2 sw=4 foldlevel=2 ro ignorecase incsearch hlsearch titlestring=$title | nmap q :q!<CR> | nmap <HOME> gg | nmap <END> G" -
    else
      echo No man page for $* >&2
    fi
  else
    /usr/bin/man
  fi
}

# pman
# Open man page in Preview
function pman() {
  man -t "$@" | open -f -a /Applications/Preview.app
}

function ws {
  local name="$1"
  if [ -z "$name" ]; then
    name=$(basename $(git rev-parse --show-toplevel 2> /dev/null))
  fi
  if [ -z "$name" ]; then
    echo "requires a name or in git repository"
    exit 1
  fi
  local localname=${2:-workspace}
  mkdir -p "$HOME/Documents/workspace/$name"
  mkdir -p "$HOME/Dropbox/workspace/$name"
  ln -nsf "$HOME/Documents/workspace/$name" "$localname"
  ln -nsf "$HOME/Dropbox/workspace/$name" "$HOME/Documents/workspace/$name/dropbox"
}

function hs { [ -z "$1" ] && history || (history | grep "$@") }

function nocaps {
  setxkbmap -option ctrl:nocaps
}

function marked() {
  if [ "$1" ]
  then
    open -a "Marked 2.app" "$1"
  else
    open -a "Marked 2.app"
  fi
}
