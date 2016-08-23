# -*- sh -*-
##################################################
# Editor
alias e="emacs-dwim"
alias et="emacs-dwim -t"
alias en="emacs-dwim -n"
alias fp="file-picker"
alias vi='vim'
alias :e=vim
function tv() {
  tmux neww "vim $*"
}
alias view='vim -R'
alias ctrlp='vim +CtrlP'

##################################################
# TMUX
alias t="tmux"
alias tl="tmux ls"
alias tn="tmux neww"
alias ts="tmux new -s"
alias ta="tmux attach -t"
alias tu="tmux-up"

##################################################
# Git
alias g="git"
alias gn="git number -s"
alias gna="git number add"
alias gnc="git number -c"
alias gh="hub"
alias gst="git status"

##################################################
# File
# absolute ls
alias tree='tree -CFA -I ".git" --dirsfirst'

alias dud='du --max-depth=1 -h'
alias duf='du -sh *'
alias fd='find . -type d -name'
alias ff='find . -type f -name'

alias rm="rm -i"
alias mv="mv -i"
alias cp="cp -i"
alias cpv="rsync -poghb --backup-dir=/tmp/rsync -e /dev/null --progress --"

# fasd
if which fasd > /dev/null 2>&1; then
  eval "$(fasd --init auto)"
  unalias z
  alias j='fasd_cd -d'
  alias jj='fasd_cd -d -i'
  alias sf='fasd -sif'
  alias sd='fasd -sid'
  alias o="fasd -e open -f"
  alias oo="fasd -e open -f -i"
  alias ee="fasd -e emacs-dwim -f -i"
  alias v="fasd -e vim -f"
  alias vv="fasd -e vim -f -i"
  alias gv="fasd -e 'gvim --remote' -f"
  alias gvv="fasd -e 'gvim --remote' -f -i"
fi

alias di='dirs -v | head -n 10'

##################################################
# System
alias psg="ps auxw | grep -i"

if which htop > /dev/null 2>&1; then
  alias top=htop
fi
alias ttop='ps -e -o pcpu,pid,args --sort pcpu | sed "/^ 0.0 /d"'

alias df="df -hT"
alias du="du -hc"
alias dus="du -S | sort -n"
alias free="free -m"

##################################################
# Utilities
alias ping="ping -c 5"
alias more="less"
alias ltail="less +F -R"
alias lr="less -R"
alias lnum='less -N'
alias w3mgo="w3m http://www.google.com"
alias sortnr='sort -n -r'

alias oneway="rsync -ltr --progress --delete"
alias archive="rsync -ltr --progress"
alias rsync-copy="rsync -av --progress -h"
alias rsync-move="rsync -av --progress -h --remove-source-files"
alias rsync-update="rsync -avu --progress -h"
alias rsync-synchronize="rsync -avu --delete --progress -h"

alias wcat='wget -q -0 -'
alias dog=wcat

if [ -x /usr/bin/colordiff ]; then
  alias diff=colordiff
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

alias cmr=cmus-remote

alias vtig="GIT_EDITOR=vim tig"

alias urlencode='node -e "console.log(encodeURIComponent(process.argv[1]))"'
alias urldecode='node -e "console.log(decodeURIComponent(process.argv[1]))"'
encode64(){ echo -n $1 | base64 }
decode64(){ echo -n $1 | base64 --decode }
alias e64=encode64
alias d64=decode64

alias dj=django

alias vboxmanage=VBoxManage
alias vboxheadless=VBoxHeadless

alias vbox=VBoxManage
alias vheadless=VBoxHeadless

alias fg=' fg'

alias gofresh="$GOPATH/bin/fresh"

##################################################
# Dir Aliases
cb=$HOME/codebase
og=$HOME/Documents/Ongoing
gop=$GOPATH
ic=$HOME/icloud
docs=$HOME/Documents
dl=$HOME/Downloads
omz=$HOME/.fresh/source/robbyrussell/oh-my-zsh
omzp=$omz/plugins
dotfiles=$HOME/.dotfiles
dotfilesp=$HOME/.fresh/source/dotfiles-private/dotfiles-private
dotsubl="$HOME/Library/Application Support/Sublime Text 3/Packages"

