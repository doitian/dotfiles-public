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
  alias z='fasd_cd -d'
  alias zl='fasd -Rdl'
  function jj() {
    local dir="$(fasd -Rdl | fzf-tmux -1 -0 -q "$*")"
    [ -n "$dir" ] && cd "$dir"
  }

  alias f='fasd_fzf -m'
  alias d='fasd_fzf -m -d'
  alias e='fasd_fzf -e -m'
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
if command -v nnn &> /dev/null; then
  alias nnd='eval "$(cat ~/.config/nnn/.lastd 2>/dev/null && rm -f ~/.config/nnn/.lastd)"'
fi

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
cb="$HOME/codebase"
kb="$HOME/codebase/my/knowledge-base"
dcs="$HOME/Documents"
dsk="$HOME/Desktop"
prj="$HOME/Desktop/Projects"
dl="$HOME/Downloads"
dotfiles="$HOME/.dotfiles"
