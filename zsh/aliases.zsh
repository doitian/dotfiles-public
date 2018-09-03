# -*- sh -*-
##################################################
# Editor
alias vi='vim'
alias :e=vim
function tv() {
  tmux neww "vim $*"
}
alias view='vim -R'

##################################################
# TMUX
alias t="tmux"
alias tl="tmux ls"
alias tnw="tmux neww"
alias tns="tmux new -s"
alias ta="tmux-fzf-session"
alias tj="tmux-fzf-pane -s -p"
alias tk="tmux-fzf-pane -a -p"
alias tu=tmux-up

##################################################
# Git
alias g="git"
alias gst="git status"

##################################################
# File
alias tree='tree -CFA -I ".git" --dirsfirst'

alias rm="rm -i"
alias mv="mv -i"
alias cp="cp -i"
alias cpv="rsync -poghb --backup-dir=/tmp/rsync -e /dev/null --progress --"

# fzf & fasd
if which fasd > /dev/null 2>&1; then
  eval "$(fasd --init auto)"
  unalias z
  unalias zz
  unalias f
  unalias a
  unalias s
  unalias sf
  unalias sd
  unalias d

  alias j='fasd_cd -d'
  function jj() {
    local dir="$(fasd -Rdl | fzf-tmux -1 -0 -q "$*")"
    [ -n "$dir" ] && cd "$dir"
  }

  alias f='fasd_fzf -m'
  alias d='fasd_fzf -m -d'
  alias e='fasd_fzf -e -m'
  # fbr - checkout git branch (including remote branches)
  function fbr() {
    local branches branch
    branches=$(git branch --all | grep -v HEAD) &&
    branch=$(echo "$branches" |
            fzf-tmux -d $(( 2 + $(wc -l <<< "$branches") )) +m) &&
    git checkout $(echo "$branch" | sed "s/.* //" | sed "s#remotes/[^/]*/##")
  }
fi

alias di='dirs -v | head -n 10'

##################################################
# System
alias psg="ps auxw | grep -i"

##################################################
# Utilities
alias ping="ping -c 5"
alias more="less"
alias ltail="less +F -R"
alias lr="less -R"
alias lnum='less -N'
alias sortnr='sort -n -r'

alias rsync-copy="rsync -av --progress -h"
alias rsync-move="rsync -av --progress -h --remove-source-files"
alias rsync-update="rsync -avu --progress -h"
alias rsync-synchronize="rsync -avu --delete --progress -h"

if command -v colordiff &> /dev/null; then
  alias diff=colordiff
fi
if command -v prettyping &> /dev/null; then
  alias ping=prettyping
fi

alias ibc="{echo 'scale=6';cat} | bc"
function bcc () {
  local scale=6
  if [ "$1" = "-s" ]; then
    shift
    scale="$1"
    shift
  fi
  {
    echo "scale=$scale"
    echo "$*"
  } | bc
}

alias ssh="TERM=xterm-256color ssh"

alias mk=make

function encode64() {
  echo -n $1 | base64
}
function decode64() {
  echo -n $1 | base64 --decode
}
alias e64=encode64
alias d64=decode64

alias fg=' fg'
alias gfw='gfw '
alias sudo='sudo '

##################################################
# Dir Aliases
cb=$HOME/codebase
wf="$HOME/Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents"
dcs=$HOME/Documents
dsk=$HOME/Desktop
prj=$HOME/Desktop/Projects
dl=$HOME/Downloads
omz=$HOME/.oh-my-zsh
omzp=$omz/plugins
dotfiles=$HOME/.dotfiles
dotvscode="$HOME/Library/Application Support/Code/User"

